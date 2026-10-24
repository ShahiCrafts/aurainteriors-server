const { checkoutIdentity } = require("../utils/checkoutIdentity");
const { consumeDiscountUsage } = require("../services/discountUsage.service");
const { transitionOrder, commitGuestCodStock } = require("../services/orderTransition.service");
const mongoose = require("mongoose");
const crypto = require("crypto");
const Order = require("../models/order.model");
const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const Address = require("../models/address.model");
const catchAsync = require("../utils/catchAsync");
const { asString } = require("../utils/params");
const { literalRegExp } = require("../utils/escapeRegex");
const AppError = require("../utils/AppError");
const emailOutbox = require("../services/emailOutbox.service");
const stockReservation = require("../services/stockReservation.service");
const { captureEsewaPayment } = require("../services/esewaCapture.service");
const notificationEventEmitter = require("../services/notificationEventEmitter");
const { boundedLimit, boundedPage, encodeCursor, decodeCursor, cursorAfterFilter } = require("../utils/listQuery");
const { getCached, setCached } = require("../utils/ttlCache");

const { getEsewaConfig, verifyEsewaSignature, verifyEsewaPayment, verifyEsewaRefund } = require("../services/esewaVerification.service");
// FA-19: the config is resolved lazily (and cached) - importing this
// module must not crash processes that have no eSewa configuration
// (tests, tooling), while the first payment operation still fails fast
// with instructions when the credentials are absent. Production boot
// keeps the old fail-at-startup contract via server.js env validation.
let _esewaConfig = null;
const esewaConfig = () => (_esewaConfig ??= getEsewaConfig());

// OA-1: fallback removed - resolved live via config; using it while unset throws naming FRONTEND_URL.
const FRONTEND_URL_GET = () => require("../config/appConfig").requireAtUse("FRONTEND_URL");

// Generate HMAC-SHA256 signature for eSewa ePay v2
const generateEsewaSignature = (message) => {
  const hmac = crypto.createHmac("sha256", esewaConfig().secretKey);
  hmac.update(message);
  return hmac.digest("base64");
};

const { prepareOrderItems } = require("../services/checkoutItems.service");
const { selectCartItems } = require("../utils/selectCartItems");
const {
  resolveDiscountForCheckout,
  evaluateDiscount,
} = require("../services/discountResolution.service");

// Helper to calculate order totals (shared by guest + authenticated
// checkout). AR-31(a/e): the discount lookup goes through the shared
// discount-resolution core — checkout's variant keeps its own
// active/unexpired gate, transaction session and error message.
const calculateOrderTotals = async (items, discountCode, session = null) => {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }

  let discountAmount = 0;
  let discountInfo = null;

  if (discountCode) {
    const discount = await resolveDiscountForCheckout(discountCode, session);
    const { validation, discountAmount: evaluatedAmount } = evaluateDiscount(discount, subtotal);
    if (!validation.valid) throw new AppError(validation.message, 400);
    discountAmount = evaluatedAmount;
    discountInfo = { code: discount.code, percentage: discount.discountPercentage };
  }

  const shippingCost = 0; // Free shipping
  const tax = 0;
  const total = subtotal - discountAmount + shippingCost + tax;

  return { subtotal, discountAmount, discountInfo, shippingCost, tax, total };
};

// Backend URL for eSewa callbacks
const BACKEND_URL_GET = () => require("../config/appConfig").requireAtUse("BACKEND_URL");

// Generate eSewa ePay v2 payment data with signature
const generateEsewaPaymentData = (order) => {
  const data = {
    amount: (order.subtotal - order.discountAmount).toFixed(2),
    tax_amount: order.tax.toFixed(2),
    product_service_charge: (0).toFixed(2),
    product_delivery_charge: order.shippingCost.toFixed(2),
    total_amount: order.total.toFixed(2),
    transaction_uuid: order.orderId,
    product_code: esewaConfig().merchantId,
    // eSewa redirects to BACKEND, which processes payment and redirects to FRONTEND
    success_url: `${BACKEND_URL_GET()}/api/v1/orders/esewa/success`,
    failure_url: `${BACKEND_URL_GET()}/api/v1/orders/esewa/failure`,
    signed_field_names: "total_amount,transaction_uuid,product_code",
  };

  // Generate signature: total_amount,transaction_uuid,product_code
  const message = `total_amount=${data.total_amount},transaction_uuid=${data.transaction_uuid},product_code=${data.product_code}`;
  // (The signed message is not logged: it carries order metadata, B-23.)
  data.signature = generateEsewaSignature(message);
  data.payment_url = esewaConfig().paymentUrl;

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

// AR-31(e): the eSewa branch of checkout — byte-identical in the
// guest and authenticated flows, now one shared helper. Commits the
// transaction and answers 201 with the payment payload; discount
// usage and (guest) stock commit deliberately do NOT happen here —
// eSewa consumes both only at payment capture.
const respondEsewaCheckout = async (res, transaction, order) => {
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
};

// AR-31(e): the COD finalize tail — byte-identical in the guest and
// authenticated flows, now one shared helper. AR-20 contract: outbox
// mode dispatches BEFORE commit so the outbox row commits atomically
// with the order; direct mode dispatches after commit and the
// response reports the recorded outcome. The recipient is
// order.guestInfo.email — for authenticated orders that field carries
// req.user.email, which is exactly the address the confirmation email
// resolves from the order.
const finalizeCodCheckout = async ({ order, session, transaction, res }) => {
  const outbox = emailOutbox.isOutboxMode();
  if (outbox) {
    await emailOutbox.dispatchEmail(
      { kind: "order-confirmation", to: order.guestInfo.email, payload: { orderId: String(order._id) }, dedupeKey: `order-confirmation:${order._id}` },
      { session },
    );
  }
  await transaction.commitTransaction();

  let emailResult = null;
  if (!outbox) {
    emailResult = await emailOutbox.dispatchEmail(
      { kind: "order-confirmation", to: order.guestInfo.email, payload: { orderId: String(order._id) }, dedupeKey: `order-confirmation:${order._id}` },
    );
  }
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
      emailSent: outbox ? false : emailResult.status === "sent",
      ...(outbox ? { emailStatus: "queued" } : {}),
    },
  });
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

// One guest-checkout attempt: the pre-AR-25 handler body, unchanged,
// except that a failure THROWS (after aborting its transaction and
// trying the idempotent-replay response) instead of calling next() —
// the exported wrapper below owns error forwarding so it can retry.
const guestCheckoutOnce = async (req, res) => {
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

    // FA-09: friction controls for UNVERIFIED guest checkout.
    // Velocity limits per email and per phone over 24h, plus a hard cap
    // on guest order size. Owner-approved 2026-10-23: guest COD stock
    // is NO LONGER deducted at placement - the order is a reservation
    // and stock is committed only when the order is confirmed (see
    // orderTransition.service.js), so unverified guest orders cannot
    // exhaust inventory. Stale pending reservations are cleaned up
    // when GUEST_COD_HOLD_RELEASE_HOURS is set (backgroundTasks.js).
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [byEmail, byPhone] = await Promise.all([
      Order.countDocuments({ isGuestOrder: true, "guestInfo.email": String(email || "").toLowerCase(), createdAt: { $gt: since } }),
      phone ? Order.countDocuments({ isGuestOrder: true, "guestInfo.phone": String(phone), createdAt: { $gt: since } }) : Promise.resolve(0),
    ]);
    if (byEmail >= 3 || byPhone >= 3) {
      throw new AppError("Too many recent guest orders for this email or phone. Please sign in or try again later.", 429);
    }
    const requestedItems = Array.isArray(items) ? items : [];
    const totalQuantity = requestedItems.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
    if (requestedItems.length > 20 || totalQuantity > 20) {
      throw new AppError("Guest orders are limited to 20 items. Please sign in for larger orders.", 400);
    }

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
          stockDeducted: false, // FA-09: guests commit stock at confirmation (COD) or capture (eSewa), never at placement
          paymentStatus: "pending",
          orderStatus: "pending",
          customerNote,
          statusHistory: [{ status: "pending", note: "Order placed" }],
        },
      ],
      session ? { session } : {},
    );

    // AR-25 (D-D): with GUEST_STOCK_RESERVATION=on, placement now
    // HOLDS the order's stock (Product.reservedStock + a TTL ledger
    // entry per product, inside this transaction) so concurrent
    // guest orders can no longer all validate against the same last
    // units. This covers eSewa (pending — the real oversell window)
    // and COD (whose in-place confirmation below consumes the hold
    // immediately). Flag off: no holds, behavior exactly as before.
    if (stockReservation.isEnabled()) {
      await stockReservation.reserveForOrder(order, session);
    }

    // FA-09 (owner-approved 2026-10-23): NO stock is deducted at
    // placement for guest orders. Availability was validated by
    // prepareOrderItems as a placement-time check; the binding
    // deduction for guest COD happens at confirmation - which for a
    // guest COD order is the in-place confirmation below (via the
    // shared commitGuestCodStock helper, the same code the
    // transitionOrder hook runs for pending->confirmed) - and for
    // guest eSewa at payment capture (esewaCapture.service.js) - the
    // same commit-at-trust-point pattern authenticated eSewa orders
    // already used.

    // COD consumes usage on confirmation; eSewa consumes only at capture.
    if (paymentMethod !== "esewa") {
      await consumeDiscountUsage(order, session);
    }

    // Handle eSewa redirection setup (AR-31(e): shared branch)
    if (paymentMethod === "esewa") {
      return await respondEsewaCheckout(res, transaction, order); // awaited: the finally block must not end the session before the commit settles
    }

    // COD: Finalize order status within transaction.
    // Commit-audit C-2: this in-place confirmation IS the FA-09
    // confirmation point for a guest COD order - transitionOrder's
    // pending->confirmed hook can never fire for an order that leaves
    // checkout already confirmed, so the guarded stock commitment must
    // run here, inside this transaction, or the stock is never
    // deducted at all.
    await commitGuestCodStock(order, session);
    // AR-25: the in-place confirmation committed the stock, so any
    // reservation hold placed above is consumed (unconditional call
    // — a no-op when the flag was off and no holds exist).
    await stockReservation.consumeForOrder(order._id, session);
    order.stockDeducted = true;
    order.orderStatus = "confirmed";
    order.confirmedAt = new Date();
    order.addStatusHistory("confirmed", "Cash on Delivery order confirmed");
    await order.save(session ? { session } : {});

    // AR-20 + AR-31(e): shared COD finalize tail (see finalizeCodCheckout).
    await finalizeCodCheckout({ order, session, transaction, res });
  } catch (error) {
    if (session.inTransaction()) await transaction.abortTransaction();
    if (error.code === 11000 && identity && await replayCheckout(identity, res)) return;
    throw error;
  } finally {
    await session.endSession();
  }
};

// AR-25 deviation (documented in AUDIT_ARCH_TRACKER.md): with
// reservations ON, concurrent guest placements for the same product
// write the same document inside overlapping transactions, and
// MongoDB aborts the losers with WriteConflict (code 112, labelled
// TransientTransactionError) instead of letting the atomic gate
// answer a clean 400. The MongoDB-documented remedy is to retry the
// WHOLE transaction: a retried placement re-reads availability and
// then either reserves or fails with the gate's 400. The retry is
// gated on the flag — flag off, guest checkout remains exactly one
// attempt, byte-identical to before.
const isTransientTransactionError = (error) => !!error && (
  error.code === 112 ||
  (typeof error.hasErrorLabel === "function" && error.hasErrorLabel("TransientTransactionError")) ||
  (Array.isArray(error.errorLabels) && error.errorLabels.includes("TransientTransactionError"))
);

exports.guestCheckout = catchAsync(async (req, res, next) => {
  const maxAttempts = stockReservation.isEnabled() ? 8 : 1;
  for (let attempt = 1; ; attempt++) {
    try {
      await guestCheckoutOnce(req, res);
      return;
    } catch (error) {
      if (attempt >= maxAttempts || !isTransientTransactionError(error)) return next(error);
      await new Promise((resolve) => setTimeout(resolve, Math.min(25 * attempt, 150)));
    }
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
    // AR-47: the populated product is only read for its _id downstream
    // (prepareOrderItems re-fetches and validates price/stock/images
    // with its own projection), so the populate projects just the
    // identity fields instead of hydrating full product documents.
    const cartQuery = Cart.findOne({ user: userId }).populate({
      path: "items.product",
      select: "_id name price stock images status",
    });
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
        // Look up the saved billing address exactly like shipping above.
        // (Previously this spread `...identity` into the filter, overwriting
        // _id with the checkout id and adding non-Address fields, so the
        // query could never match and billing silently became shipping.)
        const billingQuery = Address.findOne({
          _id: billingAddressId,
          user: userId,
        });
        const savedBilling = session ? await billingQuery.session(session) : await billingQuery;

        if (!savedBilling) {
          await transaction.abortTransaction();
          return next(new AppError("Billing address not found", 404));
        }
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

    // Handle payment (AR-31(e): shared eSewa branch)
    if (paymentMethod === "esewa") {
      return await respondEsewaCheckout(res, transaction, order); // awaited: the finally block must not end the session before the commit settles
    }

    // COD: Confirm order
    order.orderStatus = "confirmed";
    order.confirmedAt = new Date();
    order.addStatusHistory("confirmed", "Cash on Delivery order confirmed");
    await order.save(session ? { session } : {});

    // AR-20 + AR-31(e): shared COD finalize tail (see finalizeCodCheckout).
    await finalizeCodCheckout({ order, session, transaction, res });
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

  // FA-45: public tracking returns a STATUS-LEVEL view only. The full
  // record (shipping/billing addresses, phone, stored payment-gateway
  // response) must never ride an email+order-id check - order ids are
  // sequential-ish and email is not a strong authenticator. The client
  // must render tracking from these fields (see OWNER_DECISIONS.md).
  const tracking = {
    orderId: order.orderId,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    items: (order.items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    shippingCost: order.shippingCost,
    tax: order.tax,
    total: order.total,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    confirmedAt: order.confirmedAt || null,
    shippedAt: order.shippedAt || null,
    deliveredAt: order.deliveredAt || null,
  };

  res.status(200).json({
    success: true,
    data: { order: tracking },
  });
});

// ========== USER ORDER HISTORY ==========

exports.getMyOrders = catchAsync(async (req, res, next) => {
  const { status } = req.query;
  const page = boundedPage(req.query.page);
  const limit = boundedLimit(req.query.limit, 10);

  const filter = {
    user: req.user._id,
    $or: [
      { paymentMethod: "cod" },
      { paymentMethod: "esewa", paymentStatus: { $ne: "pending" } },
    ],
  };
  // FA-76: the raw query value never reaches the filter.
  const { asEnum } = require("../utils/params");
  const statusValue = asEnum(status, ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]);
  if (statusValue) filter.orderStatus = statusValue;

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-adminNote"),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        page,
        limit,
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
  const { status, paymentStatus, search } = req.query;
  const page = boundedPage(req.query.page);
  const limit = boundedLimit(req.query.limit, 20);

  const filter = {};
  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) {
    // Literal substring search: the raw value must never reach Mongo's
    // regex engine unescaped (metacharacters changed semantics, and
    // patterns like (a+)+$ are ReDoS against long fields).
    const searchRegex = literalRegExp(search);
    filter.$or = [
      { orderId: searchRegex },
      { "guestInfo.email": searchRegex },
      { "guestInfo.firstName": searchRegex },
      { "guestInfo.lastName": searchRegex },
    ];
  }

  // AR-19: additive cursor mode. Only when ?cursor= is present
  // (empty string = start of the walk); the response then carries a
  // nextCursor field and pages by keyset on (createdAt desc, _id desc)
  // instead of skip. Absent param = byte-identical legacy behavior.
  const cursorMode = req.query.cursor !== undefined;
  const cursor = cursorMode && req.query.cursor ? decodeCursor(req.query.cursor) : null;
  const pageFilter = cursor
    ? { ...filter, $and: [...(filter.$and || []), cursorAfterFilter(cursor)] }
    : filter;
  const skip = (page - 1) * limit;

  // AR-11: the stats aggregate, the page find and the count now run
  // concurrently (previously the aggregate was awaited first, so the
  // page query waited on a full-history scan). The stats figures are
  // cached only when ANALYTICS_CACHE_TTL_MS > 0, keyed by the filter.
  const statsCacheKey = `orders:stats:${JSON.stringify(filter)}`;
  const cachedStats = getCached(statsCacheKey);
  // Calculate stats for all orders matching the filter (not just paginated)
  // Revenue only counts orders that are paid and not cancelled/refunded
  const statsPromise = cachedStats !== undefined ? Promise.resolve(cachedStats) : Order.aggregate([
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

  const [statsAggregation, ordersPage, total] = await Promise.all([
    statsPromise,
    cursorMode
      ? Order.find(pageFilter)
          .populate("user", "firstName lastName email")
          .sort({ createdAt: -1, _id: -1 })
          .limit(limit + 1)
          .lean()
      : Order.find(filter)
          .populate("user", "firstName lastName email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
    Order.countDocuments(filter),
  ]);

  const stats = statsAggregation[0] || {
    totalRevenue: 0,
    totalOrders: 0,
    pendingRevenue: 0,
    refundedAmount: 0,
  };
  if (cachedStats === undefined) setCached(statsCacheKey, statsAggregation);

  let orders = ordersPage;
  let nextCursor;
  if (cursorMode) {
    const hasMore = ordersPage.length > limit;
    orders = hasMore ? ordersPage.slice(0, limit) : ordersPage;
    nextCursor = hasMore && orders.length > 0 ? encodeCursor(orders[orders.length - 1]) : null;
  }

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        totalRevenue: stats.totalRevenue,
        pendingRevenue: stats.pendingRevenue,
        refundedAmount: stats.refundedAmount,
      },
      ...(cursorMode ? { nextCursor } : {}),
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
      `${FRONTEND_URL_GET()}/checkout/payment-failed?error=missing_data`,
    );
  }

  let responseData;
  try {
    // Decode Base64 response
    const decodedData = Buffer.from(data, "base64").toString("utf-8");
    responseData = JSON.parse(decodedData);
  } catch (error) {
    return res.redirect(
      `${FRONTEND_URL_GET()}/checkout/payment-failed?error=invalid_response`,
    );
  }

  // Validate the signed response before accessing its fields.
  if (!verifyEsewaSignature(responseData, esewaConfig())) {
    return res.redirect(
      `${FRONTEND_URL_GET()}/checkout/payment-failed?error=signature_mismatch`,
    );
  }

  const { transaction_uuid, status, transaction_code } = responseData;
  // Find the order (CQ-B: the lookup key is forced to a string at the
  // point of use - the signed payload is verified above, and this
  // keeps a non-string value from ever becoming a query operator)
  const orderId = asString(transaction_uuid, 100);
  const order = orderId ? await Order.findOne({ orderId }) : null;
  if (!order) {
    return res.redirect(
      `${FRONTEND_URL_GET()}/checkout/payment-failed?error=order_not_found`,
    );
  }

  if (status !== "COMPLETE") {
    // An incomplete browser return cannot downgrade a captured payment.
    return res.redirect(`${FRONTEND_URL_GET()}/checkout/payment-failed?error=payment_incomplete`);
  }
  if (typeof transaction_code !== "string" || !transaction_code.trim() || transaction_code.length > 200) {
    return res.redirect(`${FRONTEND_URL_GET()}/checkout/payment-failed?error=invalid_transaction`);
  }

  try {
    await verifyEsewaPayment(responseData, order, esewaConfig());
  } catch (_error) {
    return res.redirect(`${FRONTEND_URL_GET()}/checkout/payment-failed?error=payment_verification_failed`);
  }

  let capture;
  try {
    capture = await captureEsewaPayment(order._id, esewaConfig().merchantId, responseData);
  } catch (_error) {
    // No nontransactional fallback: a replica set is required for capture.
    console.error("eSewa capture could not be committed; reconciliation required");
    return res.redirect(`${FRONTEND_URL_GET()}/checkout/payment-failed?error=payment_reconciliation_required`);
  }
  if (capture.outcome === "review_required") {
    return res.redirect(`${FRONTEND_URL_GET()}/checkout/payment-failed?error=payment_reconciliation_required`);
  }
  // External effects only occur for the request which committed this capture.
  if (capture.applied) {
    const confirmedOrder = await Order.findById(order._id);
    // AR-20: capture already committed, so no session in either mode.
    // Direct dispatch awaits the attempt (its result is recorded on
    // the outbox row); failures keep the equivalent error log and
    // never block the redirect.
    try {
      const r = await emailOutbox.dispatchEmail({
        kind: "order-confirmation",
        to: confirmedOrder.guestInfo?.email,
        payload: { orderId: String(confirmedOrder._id) },
        dedupeKey: `order-confirmation:${confirmedOrder._id}`,
      });
      if (r.status === "failed") console.error("eSewa confirmation email delivery failed");
    } catch {
      console.error("eSewa confirmation email delivery failed");
    }
    emitOrderNotifications(confirmedOrder);
  }
  // The guest email travels in the redirect only when there is no
  // account to identify the customer by (B-23): URLs are captured by
  // browser history and intermediary logs, so an authenticated
  // customer's address should not ride in one unnecessarily. The
  // guest confirmation flow, which needs orderId + email, is
  // unchanged.
  const emailParam = !order.user && order.guestInfo?.email
    ? `&email=${encodeURIComponent(order.guestInfo.email)}`
    : "";
  return res.redirect(
    `${FRONTEND_URL_GET()}/order-confirmation/${order.orderId}?emailSent=${capture.applied}${emailParam}`,
  );
});

// A browser failure return has no authority to mutate a payment or order.
exports.esewaFailure = (_req, res) => {
  return res.redirect(`${FRONTEND_URL_GET()}/checkout/payment-failed`);
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

  let order = await Order.findOne({ _id: req.params.id, user: req.user._id }).populate(
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

  // Conditional atomic write (B-29): the state checks above are
  // re-asserted in the update filter, so two concurrent requests
  // cannot both open a return (previously check-then-save raced, and
  // the loser's save could clobber the winner's state).
  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id,
      orderStatus: "delivered",
      "returnRequest.status": { $in: ["none", null] },
    },
    {
      $set: {
        returnRequest: {
          status: "requested",
          reason,
          description: description || "",
          requestedAt: new Date(),
        },
      },
      $push: {
        statusHistory: {
          status: "delivered",
          note: `Return requested: ${reason}`,
          timestamp: new Date(),
        },
      },
    },
    { new: true },
  ).populate("user", "firstName lastName email");

  if (!updatedOrder) {
    return next(
      new AppError("This order changed while your request was being processed. Please try again.", 409),
    );
  }
  order = updatedOrder;

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

  let order = await Order.findById(req.params.id).populate(
    "user",
    "firstName lastName email",
  );

  if (!order) {
    return next(new AppError("Order not found", 404));
  }

  if (!order.returnRequest || order.returnRequest.status !== "requested") {
    return next(new AppError("No pending return request found", 400));
  }

  // Conditional atomic write (B-29): only an order whose return is
  // still "requested" can be processed, decided inside the update
  // filter - two admins (or a double-submit) racing previously both
  // passed the check above and both saved, double-firing the refund
  // request and notifications.
  const note =
    status === "approved"
      ? `Return approved: ${adminNote || "Approved by admin"}`
      : `Return rejected: ${adminNote || "Rejected by admin"}`;
  const update = {
    $set: {
      "returnRequest.status": status,
      "returnRequest.processedAt": new Date(),
      "returnRequest.adminNote": adminNote || "",
    },
    $push: {
      statusHistory: { status: "delivered", note, timestamp: new Date() },
    },
  };
  if (status === "approved" && order.paymentStatus === "paid") {
    // Approval is not physical receipt: do not restock unreceived goods.
    update.$set.refundRequest = {
      status: "pending",
      requestedAt: new Date(),
      reason: "Return approved; awaiting returned goods and refund reconciliation",
    };
  }
  const updatedOrder = await Order.findOneAndUpdate(
    { _id: req.params.id, "returnRequest.status": "requested" },
    update,
    { new: true },
  ).populate("user", "firstName lastName email");

  if (!updatedOrder) {
    return next(new AppError("No pending return request found", 400));
  }
  order = updatedOrder;

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
    try { reference = await verifyEsewaRefund(order, esewaConfig()); }
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
