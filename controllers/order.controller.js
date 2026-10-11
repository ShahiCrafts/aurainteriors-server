const { checkoutIdentity } = require("../utils/checkoutIdentity");
const { consumeDiscountUsage } = require("../services/discountUsage.service");
const { transitionOrder } = require("../services/orderTransition.service");
const mongoose = require("mongoose");
const crypto = require("crypto");
const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const Discount = require("../models/discount.model");
const Address = require("../models/address.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { sendOrderConfirmationEmail: sendOrderConfirmationEmailService } = require("../services/email.service");
const { captureEsewaPayment } = require("../services/esewaCapture.service");
const notificationEventEmitter = require("../services/notificationEventEmitter");

const { getEsewaConfig, verifyEsewaSignature, verifyEsewaPayment, verifyEsewaRefund } = require("../services/esewaVerification.service");
const ESEWA_CONFIG = getEsewaConfig();

const FRONTEND_URL = process.env.FRONTEND_URL || "https://localhost:5173";

// Generate HMAC-SHA256 signature for eSewa ePay v2
const generateEsewaSignature = (message) => {
  const hmac = crypto.createHmac("sha256", ESEWA_CONFIG.secretKey);
  hmac.update(message);
  return hmac.digest("base64");
};

const { prepareOrderItems } = require("../services/checkoutItems.service");
const { selectCartItems } = require("../utils/selectCartItems");

// Helper to calculate order totals
const calculateOrderTotals = async (items, discountCode, session = null) => {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }

  let discountAmount = 0;
  let discountInfo = null;

  if (discountCode) {
    const discount = await Discount.findOne({
      code: discountCode.toUpperCase(),
      isActive: true,
      expiryDate: { $gt: new Date() },
    }).session(session);

    if (!discount) throw new AppError("Invalid or expired discount code", 400);
    const validation = discount.validateForCart(subtotal);
    if (!validation.valid) throw new AppError(validation.message, 400);
    discountAmount = discount.calculateDiscount(subtotal);
    discountInfo = { code: discount.code, percentage: discount.discountPercentage };
  }

  const shippingCost = 0; // Free shipping
  const tax = 0;
  const total = subtotal - discountAmount + shippingCost + tax;

  return { subtotal, discountAmount, discountInfo, shippingCost, tax, total };
};

// Backend URL for eSewa callbacks
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

// Helper function to send order confirmation email
const sendOrderConfirmationEmail = async (order) => {
  try {
    await sendOrderConfirmationEmailService(order);
    return true;
  } catch (error) {
    console.error("Failed to send order confirmation email:", error.message);
    return false;
  }
};

// Generate eSewa ePay v2 payment data with signature
const generateEsewaPaymentData = (order) => {
  const data = {
    amount: (order.subtotal - order.discountAmount).toFixed(2),
    tax_amount: order.tax.toFixed(2),
    product_service_charge: (0).toFixed(2),
    product_delivery_charge: order.shippingCost.toFixed(2),
    total_amount: order.total.toFixed(2),
    transaction_uuid: order.orderId,
    product_code: ESEWA_CONFIG.merchantId,
    // eSewa redirects to BACKEND, which processes payment and redirects to FRONTEND
    success_url: `${BACKEND_URL}/api/v1/orders/esewa/success`,
    failure_url: `${BACKEND_URL}/api/v1/orders/esewa/failure`,
    signed_field_names: "total_amount,transaction_uuid,product_code",
  };

  // Generate signature: total_amount,transaction_uuid,product_code
  const message = `total_amount=${data.total_amount},transaction_uuid=${data.transaction_uuid},product_code=${data.product_code}`;
  console.log("ESEWA Signature Message:", message);
  data.signature = generateEsewaSignature(message);
  data.payment_url = ESEWA_CONFIG.paymentUrl;

  return data;
};

// Helper for order notifications
const emitOrderNotifications = (order) => {
  try {
    // 1. User notification (for authenticated users)
    if (order.user) {
      notificationEventEmitter.emit("order:created", {
        userId: order.user,
        orderId: order._id,
        total: order.total,
        paymentMethod: order.paymentMethod,
      });
    }

    // 2. Admin notification
    notificationEventEmitter.emit("admin:order:new", {
      orderId: order._id,
      orderNumber: order.orderId,
      customerName: order.isGuestOrder
        ? `${order.guestInfo.firstName} ${order.guestInfo.lastName}`
        : `${order.guestInfo?.firstName || "Customer"} ${order.guestInfo?.lastName || ""}`,
      customerEmail: order.guestInfo?.email,
      total: order.total,
      paymentMethod: order.paymentMethod,
      itemCount: order.items.length,
    });
  } catch (error) {
    console.error("Failed to emit order notifications:", error.message);
  }
};

// Checkout requires real transactions; standalone writes cannot preserve inventory.
const startTransactionSession = async () => {
  const session = await mongoose.startSession();
  try { session.startTransaction(); return session; }
  catch (error) { await session.endSession(); throw error; }
};

const replayCheckout = async (identity, res) => {
  if (!identity) return false;
  const existing = await Order.findOne({ _id: identity._id, idempotencyKey: identity.idempotencyKey });
  if (!existing) return false;
  if (existing.requestHash !== identity.requestHash) throw new AppError("Checkout key was already used with different details", 409);
  const data = { order: { orderId: existing.orderId, total: existing.total, orderStatus: existing.orderStatus,
    paymentMethod: existing.paymentMethod, email: existing.guestInfo.email }, replayed: true };
  if (existing.paymentMethod === "esewa" && existing.paymentStatus === "pending" && existing.orderStatus === "pending") data.esewa = generateEsewaPaymentData(existing);
  res.status(201).json({ success: true, message: "Existing checkout returned", data });
  return true;
};

// ========== GUEST CHECKOUT ==========

exports.guestCheckout = catchAsync(async (req, res, next) => {
  const identity = checkoutIdentity(req);
  if (await replayCheckout(identity, res)) return;
  const transaction = await startTransactionSession();
  const session = transaction;

  try {
    const {
      email,
      firstName,
      lastName,
      phone,
      items,
      shippingAddress,
      billingAddress,
      useSameAddress,
      paymentMethod,
      discountCode,
      customerNote,
    } = req.body;

    // Prepare order items and validate stock within transaction
    const orderItems = await prepareOrderItems(items, session);

    // Calculate totals within transaction
    const totals = await calculateOrderTotals(
      orderItems,
      discountCode,
      session,
    );

    // Create order within transaction
    const [order] = await Order.create(
      [
        {
          ...(identity || {}),
          isGuestOrder: true,
          guestInfo: {
            email: email.toLowerCase(),
            firstName,
            lastName,
            phone,
          },
          items: orderItems,
          shippingAddress,
          billingAddress: useSameAddress ? shippingAddress : billingAddress,
          ...totals,
          discountCode: totals.discountInfo,
          paymentMethod,
          stockDeducted: paymentMethod !== "esewa",
          paymentStatus: "pending",
          orderStatus: "pending",
          customerNote,
          statusHistory: [{ status: "pending", note: "Order placed" }],
        },
      ],
      session ? { session } : {},
    );

    // Update product stock within transaction (only for non-eSewa orders like COD)
    if (paymentMethod !== "esewa") {
      // FIX: Batch update all products with bulkWrite instead of individual updates (N+1 prevention)
      const bulkOps = orderItems.map((item) => ({
        updateOne: {
          filter: {
            _id: item.product,
            deletedAt: null, status: "active",
            stock: { $gte: item.quantity },
          },
          update: {
            $inc: { stock: -item.quantity },
          },
        },
      }));

      if (bulkOps.length > 0) {
        const result = await Product.bulkWrite(bulkOps, {
          session: session || undefined,
        });

        // Verify all products were updated
        if (result.modifiedCount !== orderItems.length) {
          throw new AppError(
            "Insufficient stock for one or more products in your cart. Please review.",
            400
          );
        }
      }
    }

    // COD consumes usage on confirmation; eSewa consumes only at capture.
    if (paymentMethod !== "esewa") {
      await consumeDiscountUsage(order, session);
    }

    // Handle eSewa redirection setup
    if (paymentMethod === "esewa") {
      const esewaData = generateEsewaPaymentData(order);
      await transaction.commitTransaction();

      return res.status(201).json({
        success: true,
        message: "Order created. Proceed to payment.",
        data: {
          order: {
            orderId: order.orderId,
            total: order.total,
          },
          esewa: esewaData,
        },
      });
    }

    // COD: Finalize order status within transaction
    order.orderStatus = "confirmed";
    order.confirmedAt = new Date();
    order.addStatusHistory("confirmed", "Cash on Delivery order confirmed");
    await order.save(session ? { session } : {});

    await transaction.commitTransaction();

    // After success: Send order confirmation email and notifications
    sendOrderConfirmationEmail(order).catch((err) =>
      console.error(
        `Background email failed for order ${order.orderId}:`,
        err.message,
      ),
    );
    emitOrderNotifications(order);

    res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      data: {
        order: {
          orderId: order.orderId,
          orderStatus: order.orderStatus,
          paymentMethod: order.paymentMethod,
          total: order.total,
          email: order.guestInfo.email,
        },
        emailSent: true,
      },
    });
  } catch (error) {
    if (session.inTransaction()) await transaction.abortTransaction();
    if (error.code === 11000 && identity && await replayCheckout(identity, res)) return;
    return next(error);
  } finally {
    await session.endSession();
  }
});

// ========== AUTHENTICATED CHECKOUT ==========

exports.authenticatedCheckout = catchAsync(async (req, res, next) => {
  const identity = checkoutIdentity(req);
  if (await replayCheckout(identity, res)) return;
  const transaction = await startTransactionSession();
  const session = transaction;

  try {
    const userId = req.user._id;
    const {
      shippingAddressId,
      shippingAddress,
      billingAddressId,
      billingAddress,
      useSameAddress,
      paymentMethod,
      discountCode,
      customerNote,
    } = req.body;

    // Get user's cart within transaction
    const cartQuery = Cart.findOne({ user: userId }).populate("items.product");
    const cart = session ? await cartQuery.session(session) : await cartQuery;
    
    if (!cart || cart.items.length === 0) {
      await transaction.abortTransaction();
      return next(new AppError("Your cart is empty", 400));
    }

    // Prepare items from cart
    const selectedItems = selectCartItems(cart.items, req.body.selectedItemIds);
    const items = selectedItems.map((item) => ({
      cartItemId: item._id,
      productId: item.product?._id || item.product,
      quantity: item.quantity,
      variant: item.variant,
    }));

    const orderItems = await prepareOrderItems(items, session);

    // Get shipping address
    let finalShippingAddress;
    if (shippingAddressId) {
      const addressQuery = Address.findOne({
        _id: shippingAddressId,
        user: userId,
      });
      const savedAddress = session ? await addressQuery.session(session) : await addressQuery;
      
      if (!savedAddress) {
        await transaction.abortTransaction();
        return next(new AppError("Shipping address not found", 404));
      }
      finalShippingAddress = {
        fullName: savedAddress.fullName,
        phone: savedAddress.phone,
        addressLine1: savedAddress.addressLine1,
        addressLine2: savedAddress.addressLine2 || "",
        city: savedAddress.city,
        state: savedAddress.state || "",
        postalCode: savedAddress.postalCode,
        country: savedAddress.country,
      };
    } else {
      finalShippingAddress = shippingAddress;
    }

    // Get billing address
    let finalBillingAddress = finalShippingAddress;
    if (!useSameAddress) {
      if (billingAddressId) {
        const billingQuery = Address.findOne({
          _id: billingAddressId,
          ...(identity || {}),
          user: userId,
        });
        const savedBilling = session ? await billingQuery.session(session) : await billingQuery;
        
        if (savedBilling) {
          finalBillingAddress = {
            fullName: savedBilling.fullName,
            phone: savedBilling.phone,
            addressLine1: savedBilling.addressLine1,
            addressLine2: savedBilling.addressLine2 || "",
            city: savedBilling.city,
            state: savedBilling.state || "",
            postalCode: savedBilling.postalCode,
            country: savedBilling.country,
          };
        }
      } else if (billingAddress) {
        finalBillingAddress = billingAddress;
      }
    }

    // Calculate totals
    const totals = await calculateOrderTotals(
      orderItems,
      discountCode,
      session,
    );

    // Create order within transaction
    const [order] = await Order.create(
      [
        {
          ...(identity || {}),
          user: userId,
          isGuestOrder: false,
          guestInfo: {
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            phone: req.user.phone || "",
          },
          items: orderItems,
          shippingAddress: finalShippingAddress,
          billingAddress: finalBillingAddress,
          ...totals,
          discountCode: totals.discountInfo,
          paymentMethod,
          stockDeducted: paymentMethod !== "esewa",
          paymentStatus: "pending",
          orderStatus: "pending",
          customerNote,
          statusHistory: [{ status: "pending", note: "Order placed" }],
        },
      ],
      session ? { session } : {},
    );

    // Update stock within transaction (only for non-eSewa orders like COD)
    if (paymentMethod !== "esewa") {
      // FIX: Batch update all products with bulkWrite instead of individual updates (N+1 prevention)
      const bulkOps = orderItems.map((item) => ({
        updateOne: {
          filter: {
            _id: item.product,
            deletedAt: null, status: "active",
            stock: { $gte: item.quantity },
          },
          update: {
            $inc: { stock: -item.quantity },
          },
        },
      }));

      if (bulkOps.length > 0) {
        const result = await Product.bulkWrite(bulkOps, {
          session: session || undefined,
        });

        // Verify all products were updated
        if (result.modifiedCount !== orderItems.length) {
          throw new AppError(
            "Insufficient stock for one or more products in your cart. Please review.",
            400
          );
        }
      }
    }

    // COD consumes usage on confirmation; eSewa consumes only at capture.
    if (paymentMethod !== "esewa") {
      await consumeDiscountUsage(order, session);
    }

    // Clear user's cart within transaction (only for non-eSewa orders like COD)
    if (paymentMethod !== "esewa") {
      cart.items = cart.items.filter(item => !selectedItems.some(selected => String(selected._id) === String(item._id)));
      await cart.save({ session });
    }

    // Handle payment
    if (paymentMethod === "esewa") {
      const esewaData = generateEsewaPaymentData(order);
      await transaction.commitTransaction();

      return res.status(201).json({
        success: true,
        message: "Order created. Proceed to payment.",
        data: {
          order: { orderId: order.orderId, total: order.total },
          esewa: esewaData,
        },
      });
    }

    // COD: Confirm order
    order.orderStatus = "confirmed";
    order.confirmedAt = new Date();
    order.addStatusHistory("confirmed", "Cash on Delivery order confirmed");
    await order.save(session ? { session } : {});

    await transaction.commitTransaction();

    // After success: Send order confirmation email and notifications
    sendOrderConfirmationEmail(order).catch((err) =>
      console.error(
        `Background email failed for order ${order.orderId}:`,
        err.message,
      ),
    );
    emitOrderNotifications(order);

    res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      data: {
        order: {
          orderId: order.orderId,
          orderStatus: order.orderStatus,
          paymentMethod: order.paymentMethod,
          total: order.total,
          email: order.guestInfo.email,
        },
        emailSent: true,
      },
    });
  } catch (error) {
    if (session.inTransaction()) await transaction.abortTransaction();
    if (error.code === 11000 && identity && await replayCheckout(identity, res)) return;
    return next(error);
  } finally {
    await session.endSession();
  }
});

// ========== ORDER TRACKING ==========

exports.trackOrder = catchAsync(async (req, res, next) => {
  const { orderId, email } = req.body;

  const order = await Order.findOne({
    orderId: orderId.toUpperCase(),
    "guestInfo.email": email.toLowerCase(),
  }).select("-adminNote");

  if (!order) {
    return next(
      new AppError(
        "Order not found. Please check your order ID and email.",
        404,
      ),
    );
  }

  res.status(200).json({
    success: true,
    data: { order },
  });
});

// ========== USER ORDER HISTORY ==========

exports.getMyOrders = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query;

  const filter = {
    user: req.user._id,
    $or: [
      { paymentMethod: "cod" },
      { paymentMethod: "esewa", paymentStatus: { $ne: "pending" } },
    ],
  };
  if (status) filter.orderStatus = status;

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-adminNote"),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).select("-adminNote");

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  res.status(200).json({
    success: true,
    data: { order },
  });
});

// ========== ADMIN OPERATIONS ==========

exports.getAllOrders = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status, paymentStatus, search } = req.query;

  const filter = {};
  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) {
    filter.$or = [
      { orderId: { $regex: search, $options: "i" } },
      { "guestInfo.email": { $regex: search, $options: "i" } },
      { "guestInfo.firstName": { $regex: search, $options: "i" } },
      { "guestInfo.lastName": { $regex: search, $options: "i" } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Calculate stats for all orders matching the filter (not just paginated)
  // Revenue only counts orders that are paid and not cancelled/refunded
  const statsAggregation = await Order.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        // Only count revenue for paid orders that are not cancelled or refunded
        totalRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$paymentStatus", "paid"] },
                  {
                    $not: { $in: ["$orderStatus", ["cancelled", "refunded"]] },
                  },
                ],
              },
              "$total",
              0,
            ],
          },
        },
        totalOrders: { $sum: 1 },
        // Pending revenue: orders with pending payment that aren't cancelled
        pendingRevenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$paymentStatus", "pending"] },
                  { $ne: ["$orderStatus", "cancelled"] },
                ],
              },
              "$total",
              0,
            ],
          },
        },
        // Refunded amount
        refundedAmount: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "refunded"] }, "$total", 0],
          },
        },
      },
    },
  ]);

  const stats = statsAggregation[0] || {
    totalRevenue: 0,
    totalOrders: 0,
    pendingRevenue: 0,
    refundedAmount: 0,
  };

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      stats: {
        totalRevenue: stats.totalRevenue,
        pendingRevenue: stats.pendingRevenue,
        refundedAmount: stats.refundedAmount,
      },
    },
  });
});

exports.getOrderAdmin = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "firstName lastName email phone",
  );

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  res.status(200).json({
    success: true,
    data: { order },
  });
});

exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status, note } = req.body;
  const { order, previousStatus } = await transitionOrder({ _id: req.params.id }, status, note || `Status updated to ${status}`);

  // Emit order:statusChanged notification event
  try {
    const notificationPayload = {
      orderId: order._id,
      status: status,
      previousStatus: previousStatus,
      trackingNumber: order.trackingNumber || null,
    };

    // For authenticated users, include userId
    if (order.user) {
      notificationPayload.userId = order.user;
    } else if (order.guestInfo?.email) {
      // For guest orders, we'll use email as identifier
      notificationPayload.guestEmail = order.guestInfo.email;
    }

    notificationEventEmitter.emit("order:statusChanged", notificationPayload);
  } catch (error) {
    console.error("Failed to emit order:statusChanged event:", error.message);
  }

  res.status(200).json({
    success: true,
    message: "Order status updated",
    data: { order },
  });
});

// ========== ESEWA CALLBACKS (ePay v2) ==========

exports.esewaSuccess = catchAsync(async (req, res, next) => {
  // eSewa v2 returns Base64 encoded data in query parameter
  const { data } = req.query;

  if (typeof data !== "string" || !data || data.length > 16384) {
    return res.redirect(
      `${FRONTEND_URL}/checkout/payment-failed?error=missing_data`,
    );
  }

  let responseData;
  try {
    // Decode Base64 response
    const decodedData = Buffer.from(data, "base64").toString("utf-8");
    responseData = JSON.parse(decodedData);
  } catch (error) {
    return res.redirect(
      `${FRONTEND_URL}/checkout/payment-failed?error=invalid_response`,
    );
  }

  // Validate the signed response before accessing its fields.
  if (!verifyEsewaSignature(responseData, ESEWA_CONFIG)) {
    return res.redirect(
      `${FRONTEND_URL}/checkout/payment-failed?error=signature_mismatch`,
    );
  }

  const { transaction_uuid, status, transaction_code } = responseData;
  // Find the order
  const order = await Order.findOne({ orderId: transaction_uuid });
  if (!order) {
    return res.redirect(
      `${FRONTEND_URL}/checkout/payment-failed?error=order_not_found`,
    );
  }

  if (status !== "COMPLETE") {
    // An incomplete browser return cannot downgrade a captured payment.
    return res.redirect(`${FRONTEND_URL}/checkout/payment-failed?error=payment_incomplete`);
  }
  if (typeof transaction_code !== "string" || !transaction_code.trim() || transaction_code.length > 200) {
    return res.redirect(`${FRONTEND_URL}/checkout/payment-failed?error=invalid_transaction`);
  }

  try {
    await verifyEsewaPayment(responseData, order, ESEWA_CONFIG);
  } catch (_error) {
    return res.redirect(`${FRONTEND_URL}/checkout/payment-failed?error=payment_verification_failed`);
  }

  let capture;
  try {
    capture = await captureEsewaPayment(order._id, ESEWA_CONFIG.merchantId, responseData);
  } catch (_error) {
    // No nontransactional fallback: a replica set is required for capture.
    console.error("eSewa capture could not be committed; reconciliation required");
    return res.redirect(`${FRONTEND_URL}/checkout/payment-failed?error=payment_reconciliation_required`);
  }
  if (capture.outcome === "review_required") {
    return res.redirect(`${FRONTEND_URL}/checkout/payment-failed?error=payment_reconciliation_required`);
  }
  // External effects only occur for the request which committed this capture.
  if (capture.applied) {
    const confirmedOrder = await Order.findById(order._id);
    sendOrderConfirmationEmail(confirmedOrder).catch(() =>
      console.error("eSewa confirmation email delivery failed"));
    emitOrderNotifications(confirmedOrder);
  }
  return res.redirect(
    `${FRONTEND_URL}/order-confirmation/${order.orderId}?email=${encodeURIComponent(order.guestInfo?.email || "")}&emailSent=${capture.applied}`,
  );
});

// A browser failure return has no authority to mutate a payment or order.
exports.esewaFailure = (_req, res) => {
  return res.redirect(`${FRONTEND_URL}/checkout/payment-failed`);
};

exports.cancelOrder = catchAsync(async (req, res, next) => {
  const { order } = await transitionOrder({ _id: req.params.id, user: req.user._id }, "cancelled",
    req.body.reason || "Cancelled by user", true);

  notificationEventEmitter.emit("order.cancelled", {
    orderId: order._id,
    userId: order.user?._id,
    email: order.user?.email || order.guestInfo?.email,
    orderNumber: order.orderId,
  });

  // Emit admin notification for cancelled order
  notificationEventEmitter.emit("admin:order:cancelled", {
    orderId: order._id,
    orderNumber: order.orderId,
    customerName: order.user
      ? `${order.user.firstName} ${order.user.lastName}`
      : `${order.guestInfo?.firstName} ${order.guestInfo?.lastName}`,
    customerEmail: order.user?.email || order.guestInfo?.email,
    reason: req.body.reason || "Not specified",
    total: order.total,
  });

  res.status(200).json({
    success: true,
    message: "Order cancelled successfully",
    data: { order },
  });
});

exports.requestReturn = catchAsync(async (req, res, next) => {
  const { reason, description } = req.body;

  if (!reason) {
    return next(new AppError("Return reason is required", 400));
  }

  const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).populate(
    "user",
    "firstName lastName email",
  );

  if (!order) {
    return next(new AppError("Order not found", 404));
  }


  if (order.orderStatus !== "delivered") {
    return next(
      new AppError("Return can only be requested for delivered orders", 400),
    );
  }

  if (order.returnRequest?.status && order.returnRequest.status !== "none") {
    return next(
      new AppError(`Return request already ${order.returnRequest.status}`, 400),
    );
  }

  const deliveredDate = order.deliveredAt || order.updatedAt;
  const daysSinceDelivery = Math.floor(
    (Date.now() - new Date(deliveredDate)) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceDelivery > 7) {
    return next(
      new AppError("Return window has expired (7 days after delivery)", 400),
    );
  }

  order.returnRequest = {
    status: "requested",
    reason,
    description: description || "",
    requestedAt: new Date(),
  };

  order.addStatusHistory("delivered", `Return requested: ${reason}`);
  await order.save();

  notificationEventEmitter.emit("order.returnRequested", {
    orderId: order._id,
    userId: order.user?._id,
    email: order.user?.email || order.guestInfo?.email,
    orderNumber: order.orderId,
    reason,
  });

  // Emit admin notification for return request
  notificationEventEmitter.emit("admin:return:requested", {
    orderId: order._id,
    orderNumber: order.orderId,
    customerName: order.user
      ? `${order.user.firstName} ${order.user.lastName}`
      : `${order.guestInfo?.firstName} ${order.guestInfo?.lastName}`,
    customerEmail: order.user?.email || order.guestInfo?.email,
    reason,
  });

  res.status(200).json({
    success: true,
    message: "Return request submitted successfully",
    data: { order },
  });
});

exports.processReturnRequest = catchAsync(async (req, res, next) => {
  const { status, adminNote } = req.body;

  if (!status || !["approved", "rejected"].includes(status)) {
    return next(
      new AppError("Valid status (approved/rejected) is required", 400),
    );
  }

  const order = await Order.findById(req.params.id).populate(
    "user",
    "firstName lastName email",
  );

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (!order.returnRequest || order.returnRequest.status !== "requested") {
    return next(new AppError("No pending return request found", 400));
  }

  order.returnRequest.status = status;
  order.returnRequest.processedAt = new Date();
  order.returnRequest.adminNote = adminNote || "";

  if (status === "approved") {
    order.addStatusHistory(
      "delivered",
      `Return approved: ${adminNote || "Approved by admin"}`,
    );

    if (order.paymentStatus === "paid") {
      order.refundRequest = { status: "pending", requestedAt: new Date(), reason: "Return approved; awaiting returned goods and refund reconciliation" };
    }
    // Approval is not physical receipt: do not restock unreceived goods.

  } else {
    order.addStatusHistory(
      "delivered",
      `Return rejected: ${adminNote || "Rejected by admin"}`,
    );
  }

  await order.save();

  notificationEventEmitter.emit("order.returnProcessed", {
    orderId: order._id,
    userId: order.user?._id,
    email: order.user?.email || order.guestInfo?.email,
    orderNumber: order.orderId,
    status,
    adminNote,
  });

  res.status(200).json({
    success: true,
    message: `Return request ${status} successfully`,
    data: { order },
  });
});

// Admin reconciliation records settlement; it does not initiate a refund.
exports.reconcileRefund = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, paymentStatus: "paid", "refundRequest.status": "pending" });
  if (!order) return next(new AppError("No pending paid refund found", 404));
  let reference;
  if (order.paymentMethod === "esewa") {
    try { reference = await verifyEsewaRefund(order, ESEWA_CONFIG); }
    catch (_error) { return next(new AppError("Full refund has not been verified by eSewa", 409)); }
  } else {
    reference = req.body.reference;
    if (req.body.settlementConfirmed !== true || typeof reference !== "string" || !reference.trim() || reference.length > 200) {
      return next(new AppError("Confirm manual settlement and provide a refund reference", 400));
    }
  }
  const settled = await Order.findOneAndUpdate({ _id: order._id, paymentStatus: "paid", "refundRequest.status": "pending" }, {
    $set: { paymentStatus: "refunded", "refundRequest.status": "completed", "refundRequest.providerReference": reference,
      "refundRequest.completedAt": new Date(), "refundRequest.processedBy": req.user._id },
  }, { new: true, runValidators: true });
  if (!settled) return next(new AppError("Refund state changed; reload the order", 409));
  res.status(200).json({ success: true, message: "Refund settlement recorded", data: { order: settled } });
});
