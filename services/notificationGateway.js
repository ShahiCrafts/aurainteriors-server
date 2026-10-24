const socketIo = require("socket.io");
const authToken = require("../utils/authToken");
const User = require("../models/user.model");
const ChatService = require("./chatService");

// FA-35: localhost development origins are allowlisted ONLY outside
// production - a hard-coded localhost entry in the production socket
// allowlist (with credentials) serves no legitimate deployment.
// OA-1: socket origins derive ONLY from the shared env builder
// (FRONTEND_URL + ADMIN_URL + CORS_EXTRA_ORIGINS). The hardcoded
// production/localhost lists that used to live here are removed;
// local origins now come from .env.development via FRONTEND_URL/ADMIN_URL.
function buildSocketOrigins(env = process.env) {
  return require("../config/appConfig").buildAllowedOrigins(env);
}

// AR-15 (D-G): socket identity revalidation interval.
// SOCKET_REVALIDATE_INTERVAL_MS unset / 0 / invalid = the pre-AR-15
// behavior, byte-for-byte: refreshIdentity runs before EVERY packet.
// When set to a positive number of milliseconds, a NON-privileged
// packet revalidates at most once per interval per socket (the stamp
// of the last successful revalidation lives on the socket). The
// trade-off is deliberate and documented in
// docs/adr/ADR-0002-socket-revalidation-interval.md and
// OWNER_DECISIONS.md (D-16): a user revoked/deactivated mid-interval
// keeps receiving non-privileged handling until the next revalidation,
// at which point the socket is cut exactly as it is today.
const getSocketRevalidateIntervalMs = (env = process.env) => {
  const n = require("../config/appConfig").getInt("SOCKET_REVALIDATE_INTERVAL_MS", env);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// Privileged events ALWAYS revalidate, whatever the interval. The set
// is explicit; anything NOT listed here AND not a known non-privileged
// event is treated as privileged too (fail-closed: when in doubt,
// revalidate). Justification per entry:
//   chat:join  — grants room access: joins `chat:<id>`, and for admins
//                also `chat:<id>:admins`. A revoked or role-changed
//                account must never gain a room on a stale identity.
//   chat:leave — mutates room membership; cheap and rare, and pairing
//                it with join keeps membership changes on fresh
//                identity only.
// Known NON-privileged events (interval-throttled when the flag is on):
//   chat:typing — ephemeral relay, no persistence, no room change;
//                its handler still runs authorizeChat per event.
//   chat:read   — read receipts; its handler still runs authorizeChat
//                per event before markMessagesAsRead, so per-chat
//                authorization is NOT throttled — only the identity
//                (JWT + user/guest row) re-check is.
//   heartbeat   — pure liveness echo, no state at all.
const PRIVILEGED_SOCKET_EVENTS = Object.freeze(["chat:join", "chat:leave"]);
const NON_PRIVILEGED_SOCKET_EVENTS = Object.freeze(["chat:typing", "chat:read", "heartbeat"]);
const isPrivilegedSocketEvent = (eventName) =>
  PRIVILEGED_SOCKET_EVENTS.includes(eventName) || !NON_PRIVILEGED_SOCKET_EVENTS.includes(eventName);

class NotificationGateway {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: buildSocketOrigins(),
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // AR-33: the constructor no longer publishes the io server on
    // global.io. Consumers read it from services/runtimeContext.js,
    // which the bootstrap populates after construction.

    // AR-02 (D-A, D2): SOCKET_ADAPTER=mongo attaches the official
    // @socket.io/mongo-adapter (docs/adr/ADR-0004) so room emits cross
    // instance boundaries. Default (unset / any other value): no
    // adapter — single-instance semantics, exactly as before. The
    // attach is kicked off asynchronously and its promise is stored
    // on the instance: construction never blocks on it, and ANY
    // failure degrades to no-adapter with a loud log rather than
    // failing boot.
    this.adapterPromise = null;
    if ((require("../config/appConfig").getString("SOCKET_ADAPTER") || "").trim().toLowerCase() === "mongo") {
      this.adapterPromise = this.attachMongoAdapter();
    }

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

        // AR-15: the handshake just performed a full identity check;
        // it counts as this socket's first revalidation.
        socket.identityRevalidatedAt = Date.now();
        next();
      } catch (err) {
        next(new Error("Authentication error"));
      }
    });

    this.io.on("connection", (socket) => {
      // Revalidate identity before incoming events, not just at
      // handshake. AR-15 (D-G): with SOCKET_REVALIDATE_INTERVAL_MS
      // unset/0 this stays per-packet, exactly as before; with a
      // positive interval, non-privileged packets skip the re-check
      // inside the window, privileged events (see
      // PRIVILEGED_SOCKET_EVENTS / isPrivilegedSocketEvent) always
      // revalidate, and a failed revalidation cuts the socket.
      socket.use(async (packet, next) => {
        const intervalMs = getSocketRevalidateIntervalMs();
        if (
          intervalMs > 0 &&
          !isPrivilegedSocketEvent(packet && packet[0]) &&
          socket.identityRevalidatedAt &&
          Date.now() - socket.identityRevalidatedAt < intervalMs
        ) {
          return next();
        }
        try {
          await this.refreshIdentity(socket);
          socket.identityRevalidatedAt = Date.now();
          next();
        } catch (_error) { next(new Error("Authentication error")); socket.disconnect(true); }
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
          // FA-72: same chatId type/format validation the typing/read
          // events enforce - a malformed id never reaches authorization.
          if (typeof chatId !== "string" || !/^[a-f0-9]{24}$/i.test(chatId)) return;
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
        if (typeof chatId !== "string" || !/^[a-f0-9]{24}$/i.test(chatId)) return;
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

  // AR-02 (D2): attach @socket.io/mongo-adapter over a capped
  // collection in the application database. The adapter transports
  // via change streams (which is why AR-06 makes a replica set
  // mandatory) and its default mode assumes a capped collection.
  // Returns true on success; on ANY failure it logs loudly and
  // returns false — the gateway continues without the adapter.
  async attachMongoAdapter() {
    try {
      const mongoose = require("mongoose");
      if (!mongoose.connection || !mongoose.connection.db) {
        console.error("[Socket] SOCKET_ADAPTER=mongo but no MongoDB handle is available; continuing WITHOUT the adapter (single-instance semantics)");
        return false;
      }
      const db = mongoose.connection.db;
      const collectionName = "socketio_adapter";
      const existing = await db.listCollections({ name: collectionName }).toArray();
      if (existing.length === 0) {
        await db.createCollection(collectionName, { capped: true, size: 1000000 });
      } else {
        const stats = await db.command({ collStats: collectionName }).catch(() => null);
        if (stats && !stats.capped) {
          console.error(`[Socket] WARNING: collection "${collectionName}" already exists and is NOT capped; the MongoDB adapter's default mode assumes a capped collection - drop or convert it (MIGRATIONS.md M-7). Continuing with the adapter attached.`);
        }
      }
      const { createAdapter } = require("@socket.io/mongo-adapter");
      this.io.adapter(createAdapter(db.collection(collectionName)));
      console.log("Socket.IO MongoDB adapter attached");
      return true;
    } catch (error) {
      console.error("[Socket] Failed to attach the MongoDB adapter; continuing WITHOUT it (single-instance semantics):", error && error.message ? error.message : error);
      return false;
    }
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
module.exports.buildSocketOrigins = buildSocketOrigins;
module.exports.getSocketRevalidateIntervalMs = getSocketRevalidateIntervalMs;
module.exports.PRIVILEGED_SOCKET_EVENTS = PRIVILEGED_SOCKET_EVENTS;
module.exports.NON_PRIVILEGED_SOCKET_EVENTS = NON_PRIVILEGED_SOCKET_EVENTS;
module.exports.isPrivilegedSocketEvent = isPrivilegedSocketEvent;
