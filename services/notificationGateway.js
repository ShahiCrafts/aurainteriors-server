const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const ChatService = require("./chatService");

class NotificationGateway {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    global.io = this.io;

    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const guestSessionId = socket.handshake.auth.guestSessionId;

        if (token) {
          // Authenticated user
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.userId = decoded.id;
          socket.role = decoded.role;
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
        } catch (error) {
          socket.emit("chat:error", { chatId, message: "Unable to join chat" });
        }
      });

      socket.on("chat:leave", ({ chatId }) => {
        const room = `chat:${chatId}`;
        socket.leave(room);
        console.log(`Socket ${socket.id} (${socket.isGuest ? 'Guest' : 'User'}: ${socket.userId || socket.guestSessionId}) left room ${room}`);
      });

      socket.on("chat:typing", ({ chatId, isTyping }) => {
        socket.to(`chat:${chatId}`).emit("chat:typing:status", {
          chatId,
          isTyping,
          userId: socket.userId,
          userRole: socket.role,
        });
      });

      socket.on("chat:read", ({ chatId }) => {
        socket.to(`chat:${chatId}`).emit("chat:messages:read", {
          chatId,
          readerId: socket.userId,
          readerRole: socket.role,
        });
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

  cleanupStaleConnections() {
  }

  async close() {
    await this.io.close();
  }
}

module.exports = NotificationGateway;
