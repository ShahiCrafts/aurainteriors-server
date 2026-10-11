const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  guestCheckoutSchema,
  authenticatedCheckoutSchema,
  orderTrackingSchema,
  updateOrderStatusSchema,
  getOrdersQuerySchema,
} = require("../validators/order.validator");

router.post(
  "/guest-checkout",
  validate(guestCheckoutSchema),
  orderController.guestCheckout
);

router.post(
  "/track",
  validate(orderTrackingSchema),
  orderController.trackOrder
);

router.get("/esewa/success", orderController.esewaSuccess);
router.get("/esewa/failure", orderController.esewaFailure);

router.get(
  "/",
  protect,
  restrictTo("admin"),
  validate(getOrdersQuerySchema, "query"),
  orderController.getAllOrders
);

router.get(
  "/admin/:id",
  protect,
  restrictTo("admin"),
  orderController.getOrderAdmin
);

router.post(
  "/checkout",
  protect,
  validate(authenticatedCheckoutSchema),
  orderController.authenticatedCheckout
);

router.post("/:id/refund/reconcile", protect, restrictTo("admin"), orderController.reconcileRefund);

router.get("/my-orders", protect, orderController.getMyOrders);
router.get("/:id", protect, orderController.getOrder);
router.patch("/:id/cancel", protect, orderController.cancelOrder);
router.post("/:id/return", protect, orderController.requestReturn);
router.patch(
  "/:id/return",
  protect,
  restrictTo("admin"),
  orderController.processReturnRequest
);
router.patch(
  "/:id/status",
  protect,
  restrictTo("admin"),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

module.exports = router;
