const EventEmitter = require("events");
const runtimeContext = require("./runtimeContext"); // AR-33: explicit registry, not globals
const notificationService = require("./notificationService");

class NotificationEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setupListeners();
  }

  setupListeners() {
    this.on("admin:order:new", this.onAdminOrderNew.bind(this));
    this.on("order:created", this.onOrderCreated.bind(this));
    this.on("order:statusChanged", this.onOrderStatusChanged.bind(this));
    this.on("admin:review:new", this.onAdminReviewNew.bind(this));
    this.on("admin:contact:new", this.onAdminContactNew.bind(this));
    this.on("admin:chat:started", this.onAdminChatStarted.bind(this));
  }

  async onAdminOrderNew(data) {
    const { orderId, orderNumber, customerName, total } = data;
    try {
      const savedNotifications = await notificationService.notifyAdmins(
        "order_new",
        "New Order Received",
        `New order #${orderNumber} by ${customerName} - NRs. ${total}`,
        { orderId, orderNumber },
        "/admin/orders"
      );
      this.broadcastToAdmins("admin:notification:new", savedNotifications);
    } catch (error) {
      console.error(error);
    }
  }

  async onOrderCreated(data) {
    const { userId, orderId, total, paymentMethod } = data;
    if (!userId) return;

    try {
      const notification = await notificationService.createNotification({
        recipient: userId,
        type: "order_created",
        title: "Order Confirmed",
        message: `Your order #${data.orderId || orderId} has been placed successfully.`,
        data: { orderId, total, paymentMethod },
        actionUrl: "/profile/orders"
      });
      this.broadcastToUser(userId, notification);
    } catch (error) {
      console.error(error);
    }
  }

  async onOrderStatusChanged(data) {
    const { userId, guestEmail, orderId, status, previousStatus, trackingNumber } = data;

    if (userId) {
      try {
        const notification = await notificationService.createNotification({
          recipient: userId,
          type: "order_status_update",
          title: "Order Update",
          message: `Your order is now ${status}.`,
          data: { orderId, status, previousStatus, trackingNumber },
          actionUrl: "/profile/orders"
        });
        this.broadcastToUser(userId, notification);
      } catch (error) {
        console.error(error);
      }
    }
  }

  async onAdminReviewNew(data) {
    const { reviewId, customerName, productName, rating } = data;
    try {
      const savedNotifications = await notificationService.notifyAdmins(
        "review_new",
        "New Product Review",
        `${customerName} rated ${productName} ${rating}/5 stars.`,
        { reviewId, productName, rating },
        "/admin/reviews"
      );
      this.broadcastToAdmins("admin:notification:new", savedNotifications);
    } catch (error) {
      console.error(error);
    }
  }

  async onAdminContactNew(data) {
    const { contactId, name, subject } = data;
    try {
      const savedNotifications = await notificationService.notifyAdmins(
        "contact_new",
        "New Contact Message",
        `${name} sent a message: ${subject}`,
        { contactId },
        "/admin/contacts"
      );
      this.broadcastToAdmins("admin:notification:new", savedNotifications);
    } catch (error) {
      console.error(error);
    }
  }

  async onAdminChatStarted(data) {
    const { chatId, customerName } = data;
    try {
      const savedNotifications = await notificationService.notifyAdmins(
        "chat_started",
        "New Support Chat",
        `${customerName} started a support chat.`,
        { chatId },
        "/admin/support"
      );
      this.broadcastToAdmins("admin:notification:new", savedNotifications);
    } catch (error) {
      console.error(error);
    }
  }

  broadcastToAdmins(event, data) {
    const io = runtimeContext.getIo();
    if (io) {
      io.to("admin:notifications").emit(event, data);
    }
  }

  broadcastToUser(userId, notification) {
    const io = runtimeContext.getIo();
    if (!io) return;
    // AR-07: sockets join the BARE userId room (notificationGateway.js)
    // and notificationService emits to the bare id as well. This method
    // previously emitted to `user:${userId}` - a room nobody ever joins,
    // so order realtime notifications reached no client - and the badge
    // payload hardcoded unreadCount: 1. Emit to the joined room and
    // compute the real count.
    const room = String(userId);
    io.to(room).emit("notification:new", notification);
    notificationService.getUnreadCount(userId)
      .then((unreadCount) => { io.to(room).emit("badge:update", { unreadCount }); })
      .catch((error) => { console.error("Failed to compute unread badge count:", error.message); });
  }
}

module.exports = new NotificationEventEmitter();
