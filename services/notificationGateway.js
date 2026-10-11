const socketIo = require("socket.io");
const authToken = require("../utils/authToken");
const User = require("../models/user.model");
const ChatService = require("./chatService");

class NotificationGateway {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: [process.env.FRONTEND_URL, process.env.ADMIN_URL, "http://localhost:5173", "http://localhost:5174", "https://aurainteriors.live", "https://admin.aurainteriors.live", "https://www.aurainteriors.live"].filter(Boolean),
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    global.io = this.io;

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || authToken.extract(socket.handshake);
        socket.sessionToken = token;
        const guestSessionId = socket.handshake.auth.guestSessionId;

        if (token) {
          // Authenticated user
          const decoded = await authToken.verify(token);
          const user = await User.findOne({ _id: decoded.id, isActive: true, deletedAt: null }).select("_id role").lean();
          if (!user) return next(new Error("Authentication error"));
          socket.userId = String(user._id);
          socket.role = user.role;
          socket.isGuest = false;
        } else if (guestSessionId) {
          // Guest sockets must present a real public GuestSession key.
          const guestSession = await ChatService.resolveGuestSession(guestSessionId);
          if (!guestSession) return next(new Error("Authentication error"));
          socket.guestSessionId = guestSession.sessionId;
          socket.guestSessionObjectId = guestSession._id.toString();
          socket.userId = null;
          socket.role = "customer";
          socket.isGuest = true;
        } else {
          return next(new Error("Authentication error"));
        }

        next();
      } catch (err) {
        next(new Error("Authentication error"));
      }
    });

    this.io.on("connection", (socket) => {
      // Revalidate identity before every incoming event, not just at handshake.
      socket.use(async (_packet, next) => {
        try { await this.refreshIdentity(socket); next(); }
        catch (_error) { next(new Error("Authentication error")); socket.disconnect(true); }
      });
      // Join user to personal room
      if (socket.userId) {
        socket.join(socket.userId); // Authenticated users join by ID
      } else if (socket.guestSessionId) {
        socket.join(`guest:${socket.guestSessionId}`); // Guests join by session ID
      }

      if (socket.role === "admin") {
        socket.join("admin:notifications");
      }

      socket.on("chat:join", async ({ chatId } = {}) => {
        try {
          if (!chatId) return;
          const authorized = await ChatService.authorizeChat(
            chatId, socket.userId, socket.role, socket.guestSessionId
          );
          if (!authorized) {
            socket.emit("chat:error", { chatId, message: "Not authorized to join this chat" });
            return;
          }
          const room = `chat:${chatId}`;
          socket.join(room);
          if (socket.role === "admin") socket.join(`${room}:admins`);
        } catch (error) {
          socket.emit("chat:error", { chatId, message: "Unable to join chat" });
        }
      });

      socket.on("chat:leave", ({ chatId } = {}) => {
        const room = `chat:${chatId}`;
        socket.leave(room);
        socket.leave(`${room}:admins`);
        console.log(`Socket ${socket.id} (${socket.isGuest ? 'Guest' : 'User'}: ${socket.userId || socket.guestSessionId}) left room ${room}`);
      });

      const authorizeEvent = async (chatId) => {
        if (typeof chatId !== "string" || !/^[a-f0-9]{24}$/i.test(chatId)) return false;
        return ChatService.authorizeChat(chatId, socket.userId, socket.role, socket.guestSessionId);
      };
      socket.on("chat:typing", async ({ chatId, isTyping } = {}) => {
        try {
          if (typeof isTyping !== "boolean" || !await authorizeEvent(chatId)) return;
          socket.to(`chat:${chatId}`).emit("chat:typing:status", {
            chatId, isTyping, userId: socket.userId, userRole: socket.role,
          });
        } catch (_error) { socket.emit("chat:error", { message: "Unable to update typing status" }); }
      });
      socket.on("chat:read", async ({ chatId } = {}) => {
        try {
          if (!await authorizeEvent(chatId)) return;
          await ChatService.markMessagesAsRead(chatId, socket.userId, socket.role, socket.guestSessionId);
        } catch (_error) { socket.emit("chat:error", { message: "Unable to update read status" }); }
      });

      socket.on("heartbeat", () => {
        socket.emit("heartbeat:ack", { timestamp: new Date() });
      });

      socket.on("disconnect", () => { });
    });
  }

  getActiveUserCount() {
    return this.io.engine.clientsCount;
  }

  broadcastHeartbeat() {
    this.io.emit("heartbeat", { timestamp: new Date() });
  }

  async refreshIdentity(socket) {
    if (socket.isGuest) {
      if (!await ChatService.resolveGuestSession(socket.guestSessionId)) throw new Error("Expired guest session");
      return;
    }
    const decoded = await authToken.verify(socket.sessionToken);
    const user = await User.findOne({ _id: decoded.id, isActive: true, deletedAt: null }).select("_id role").lean();
    if (!user || String(user._id) !== socket.userId) throw new Error("Inactive account");
    // A role change invalidates existing room memberships and connection.
    if (user.role !== socket.role) throw new Error("Account role changed");
  }

  async cleanupStaleConnections() {
    for (const socket of this.io.sockets.sockets.values()) {
      try { await this.refreshIdentity(socket); }
      catch (_error) { socket.disconnect(true); }
    }
  }

  async close() {
    await this.io.close();
  }
}

module.exports = NotificationGateway;
