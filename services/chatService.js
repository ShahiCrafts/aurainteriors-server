const Chat = require("../models/chat.model");
const ChatMessage = require("../models/chatMessage.model");
const GuestSession = require("../models/guestSession.model");
const AppError = require("../utils/AppError");
const notificationEventEmitter = require("./notificationEventEmitter");
const User = require("../models/user.model");
const runtimeContext = require("./runtimeContext"); // AR-33: explicit registry, not globals

// FA-07 (FRESH) / AR-30: the chatV2 turn identity, extracted from the
// v2 dispatcher's inline turn context so it can be unit-tested.
// userId comes from the chat's server-side customer record only (null
// for guest chats); guestSessionId travels separately as a lookup
// throttle key (FA-13) and is never an account identity.
function buildV2TurnIdentity({ customer, guestSessionId = null }) {
  return {
    userId: customer ? String(customer) : null,
    guestSessionId: guestSessionId || null,
  };
}

// FA-34 (FRESH): chat-existence oracle. For non-admin callers, an
// unauthorized chat must be indistinguishable from a missing one (404);
// admins keep an explicit 403.
function denyChatAccess(userRole) {
  if (userRole === "admin")
    throw new AppError("You are not authorized for this chat", 403);
  throw new AppError("Chat not found", 404);
}

// AR-38: ONE bookkeeping path for every persisted message. Extracted
// from sendMessage so the chatV2 bot job runs the SAME updates the
// legacy pipeline got by sending bot replies through sendMessage:
// lastMessageAt (chat-list ordering), per-role lastRead markers,
// markAsRead for bot replies, and the chat:messages:read broadcast.
// Returns didReopen (a customer message reopening a resolved/closed
// chat), which sendMessage needs for its system-message block.
async function applyMessageBookkeeping(chat, chatId, senderRole, senderId) {
  // Update chat based on sender role.
  // CHAT-FIXES-8 Fix 1: Use timestamp-based read tracking instead of static counters.
  // Unread counts are now derived dynamically: count(messages.createdAt > lastReadAt).
  const now = new Date();
  const updateData = {
    lastMessageAt: now,
  };

  let didReopen = false;

  if (senderRole === "customer") {
    // When the customer sends, they've implicitly read up to now
    updateData.lastReadCustomerAt = now;
    updateData.customerTyping = false;

    // CHAT-FIXES-9 Fix 1: Reopen resolved/closed chat to ai_handling, reactivating AI bot
    if (["resolved", "closed"].includes(chat.status)) {
      updateData.status = "ai_handling";
      updateData.metadata = {
        ...(chat.metadata || {}),
        botActive: true,
      };
      didReopen = true;
    }
  } else if (senderRole === "bot") {
    // Bot reply — bot has read the customer's messages!
    updateData.lastReadAdminAt = now;

    // Mark all customer messages in this chat as read
    await ChatMessage.markAsRead(chatId, "admin");

    // Broadcast read status via socket so customer's client knows it's read/seen
    if (runtimeContext.getNotificationGateway()) {
      const roomId = chatId.toString();
      runtimeContext
        .getNotificationGateway()
        .io.to(`chat:${roomId}`)
        .emit("chat:messages:read", {
          chatId: roomId,
          userId: senderId,
          userRole: "admin",
        });
    }
  } else {
    // Human admin reply — admin has seen the conversation up to now
    updateData.lastReadAdminAt = now;
    updateData.adminTyping = false;
    updateData.metadata = {
      ...(chat.metadata || {}),
      botActive: false,
    };
    if (
      ["ai_handling", "escalated", "waiting", "active"].includes(chat.status)
    ) {
      updateData.status = "agent_handling";
    }
  }

  Chat.updateOne({ _id: chatId }, { $set: updateData }).catch((error) => {
    console.error("Chat metadata update failed:", error.message);
  });

  return didReopen;
}

// AR-16: response-time aggregation for getChatStats. The ORIGINAL
// pipeline aggregated over chats and $lookup-ed the ENTIRE
// chatmessages collection per chat, $filter-ing in memory — cost grew
// with total message volume. This pipeline aggregates over
// chatmessages instead: $match admin messages (fully index-supported
// once the owner runs MIGRATIONS.md M-5, {senderRole:1, chat:1,
// createdAt:1}; correct without it via the {chat, createdAt} index),
// sort per chat by
// createdAt, $group $first = the chat's first admin reply, then a SMALL
// $lookup against chats (one document per chat WITH an admin reply, not
// per message) for the chat's createdAt + status/deletedAt filter, and
// $avg. Definition note: "first admin message" here means the EARLIEST
// by createdAt; the original took the first element of the $lookup
// array (unspecified order — in practice insertion order). The two
// coincide on data inserted in createdAt order (asserted by the
// real-mongod fixture probe, tests/platform/chat-stats-integration.test.js).
function firstAdminResponsePipeline() {
  return [
    { $match: { senderRole: "admin" } },
    { $sort: { chat: 1, createdAt: 1 } },
    { $group: { _id: "$chat", firstAdminAt: { $first: "$createdAt" } } },
    {
      $lookup: {
        from: "chats",
        localField: "_id",
        foreignField: "_id",
        as: "chatDoc",
      },
    },
    { $unwind: "$chatDoc" },
    {
      $match: {
        "chatDoc.status": {
          $in: [
            "ai_handling",
            "escalated",
            "agent_handling",
            "resolved",
            "closed",
          ],
        },
        "chatDoc.deletedAt": null,
      },
    },
    {
      $project: {
        responseTime: { $subtract: ["$firstAdminAt", "$chatDoc.createdAt"] },
      },
    },
    {
      $group: {
        _id: null,
        avgResponseTime: { $avg: "$responseTime" },
      },
    },
  ];
}

class ChatService {
  async resolveGuestSession(guestSessionId) {
    // Only a high-entropy public capability grants access; Mongo IDs are not credentials.
    if (
      typeof guestSessionId !== "string" ||
      !/^guest_[a-f0-9]{64}$/.test(guestSessionId)
    )
      return null;
    // AR-41: validity (and the model's TTL index) anchor to CREATION,
    // so an actively chatting guest loses their session exactly 24h
    // after it was minted. GUEST_SESSION_TTL_MODE=activity anchors
    // validity to lastActivityAt instead (default preserves current
    // behavior) - flip it together with the TTL re-anchor in
    // MIGRATIONS.md M-2, in the order documented there.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activityAnchored =
      require("../config/appConfig").getString("GUEST_SESSION_TTL_MODE") ===
      "activity";
    const session = await GuestSession.findOne({
      sessionId: guestSessionId,
      ...(activityAnchored
        ? { lastActivityAt: { $gt: cutoff } }
        : { createdAt: { $gt: cutoff } }),
    })
      .select("_id sessionId email lastActivityAt")
      .lean();
    if (session) {
      // AR-41: keep lastActivityAt honest on the hot path. It was
      // previously set only at creation, by the pre-save hook, and
      // when a chat is created - the resolve path (every guest
      // message / socket handshake) never touched it, so an
      // activity-anchored TTL would have had nothing to anchor to.
      // Throttled (at most one write per session per 5 minutes),
      // conditional (racing touches are harmless), fire-and-forget.
      const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
      if (!session.lastActivityAt || session.lastActivityAt < staleBefore) {
        GuestSession.updateOne(
          { _id: session._id, lastActivityAt: { $lt: staleBefore } },
          { $set: { lastActivityAt: new Date() } },
        ).catch((error) =>
          console.error("Guest session activity touch failed:", error.message),
        );
      }
    }
    return session;
  }

  async createChat(customerId, data = {}) {
    const { subject, metadata } = data;

    const chat = await Chat.create({
      customer: customerId,
      subject,
      metadata: {
        ...(metadata || {}),
        botActive: true,
      },
      status: "ai_handling",
    });

    // Initialization ACK stays on the single INSERT path. Admin enrichment and
    // notifications are deliberately off the customer critical path.
    setImmediate(async () => {
      try {
        const customer = await User.findById(customerId)
          .select("firstName lastName email")
          .lean();
        notificationEventEmitter.emit("admin:chat:started", {
          chatId: chat._id,
          customerName: customer
            ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
            : null,
          customerEmail: customer?.email,
          subject,
        });
      } catch (error) {
        console.error(
          "Failed to emit admin:chat:started event:",
          error.message,
        );
      }
    });

    return chat.toObject();
  }

  /**
   * Create a chat for a guest user (unauthenticated)
   * Similar to createChat but uses guestSession instead of customer
   */
  async createGuestChat(guestSessionId, data = {}) {
    const { subject, metadata } = data;

    // Resolve the public guest session key (guest_...) to the Mongo document.
    // Internal Mongo IDs are never accepted as guest credentials.
    const guestSession = await this.resolveGuestSession(guestSessionId);
    if (!guestSession) {
      throw new AppError("Invalid guest session", 400);
    }

    const chat = await Chat.create({
      guestSession: guestSession._id,
      subject,
      metadata: {
        ...(metadata || {}),
        botActive: true,
      },
      status: "ai_handling",
    });

    // Keep guest bookkeeping off the HTTP critical path. Do not create a second
    // automatic greeting here; the orchestrator is the single source of bot replies.
    setImmediate(async () => {
      try {
        await GuestSession.updateOne(
          { _id: guestSession._id },
          {
            $addToSet: { chats: chat._id },
            $set: { lastActivityAt: new Date() },
          },
        );
      } catch (error) {
        console.error(
          "Guest chat background bookkeeping failed:",
          error.message,
        );
      }
    });

    return chat;
  }

  async enrichChatsBatch(chats) {
    if (!Array.isArray(chats) || chats.length === 0) return chats || [];
    const ids = chats.map((chat) => chat._id);
    const customerCutoffBranches = chats.map((chat) => ({
      case: { $eq: ["$chat", chat._id] },
      then: new Date(chat.lastReadCustomerAt || 0),
    }));
    const adminCutoffBranches = chats.map((chat) => ({
      case: { $eq: ["$chat", chat._id] },
      then: new Date(chat.lastReadAdminAt || 0),
    }));

    // Single bounded aggregation: compute last message + both unread counts without
    // $push-ing every historical message into RAM (the previous implementation did).
    const rows = await ChatMessage.aggregate([
      { $match: { chat: { $in: ids }, deletedAt: null } },
      { $sort: { chat: 1, createdAt: -1 } },
      {
        $set: {
          _customerCutoff: {
            $switch: { branches: customerCutoffBranches, default: new Date(0) },
          },
          _adminCutoff: {
            $switch: { branches: adminCutoffBranches, default: new Date(0) },
          },
        },
      },
      {
        $group: {
          _id: "$chat",
          lastMessage: {
            $first: { content: "$content", messageType: "$messageType" },
          },
          unreadCountCustomer: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$senderRole", ["admin", "bot"]] },
                    { $gt: ["$createdAt", "$_customerCutoff"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          unreadCountAdmin: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$senderRole", "customer"] },
                    { $gt: ["$createdAt", "$_adminCutoff"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);
    const byChat = new Map(rows.map((row) => [String(row._id), row]));
    return chats.map((chat) => {
      const row = byChat.get(String(chat._id));
      const last = row?.lastMessage;
      let lastMessageText = chat.subject || "General Inquiry";
      if (last) {
        if (last.messageType === "image") lastMessageText = "📷 Image";
        else if (last.messageType === "file") lastMessageText = "📁 File";
        else lastMessageText = last.content || lastMessageText;
      }
      return {
        ...chat,
        unreadCountCustomer: row?.unreadCountCustomer || 0,
        unreadCountAdmin: row?.unreadCountAdmin || 0,
        lastMessageText,
      };
    });
  }

  async enrichChatWithUnreadCounts(chatJson) {
    const [enriched] = await this.enrichChatsBatch(chatJson ? [chatJson] : []);
    return enriched || chatJson;
  }

  /**
   * Verify if a user (authenticated or guest) can access a chat
   * Returns true if authorized, false otherwise
   */
  async authorizeChat(
    chatId,
    userId,
    userRole,
    guestSessionId,
    loadedChat = null,
  ) {
    const chat =
      loadedChat ||
      (await Chat.findOne({
        _id: chatId,
        deletedAt: null,
      }));

    if (!chat) {
      return false;
    }

    // Admin and bot can access any chat
    if (["admin", "bot"].includes(userRole)) {
      return true;
    }

    // Authenticated customer accessing their own chat
    if (
      userId &&
      chat.customer &&
      chat.customer.toString() === userId.toString()
    ) {
      return true;
    }

    // Guest accessing their own chat via the public session key. Resolve it to
    // the internal Mongo ObjectId before comparing ownership.
    if (guestSessionId && chat.guestSession) {
      const guestSession = await this.resolveGuestSession(guestSessionId);
      if (
        guestSession &&
        chat.guestSession.toString() === guestSession._id.toString()
      ) {
        return true;
      }
    }

    return false;
  }

  async getChatById(chatId, userId, userRole, guestSessionId) {
    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    })
      .populate("customer", "firstName lastName email avatar")
      .lean();

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    // Authorization check
    const isAuthorized = await this.authorizeChat(
      chatId,
      userId,
      userRole,
      guestSessionId,
      chat,
    );
    if (!isAuthorized) {
      denyChatAccess(userRole);
    }

    const enriched = await this.enrichChatWithUnreadCounts(chat);
    // FA-58: the customer's email is staff-only data; other participants
    // (including the customer and guests) do not receive it here.
    if (
      userRole !== "admin" &&
      enriched.customer &&
      typeof enriched.customer === "object"
    ) {
      delete enriched.customer.email;
    }
    return enriched;
  }

  async getCustomerChats(customerId, options = {}) {
    const result = await Chat.getCustomerChats(customerId, options);
    result.chats = await this.enrichChatsBatch(result.chats);
    return result;
  }

  async getAllChats(options = {}) {
    const result = await Chat.getAllChats(options);
    result.chats = await this.enrichChatsBatch(result.chats);
    return result;
  }

  async getWaitingQueue() {
    const chats = await Chat.getWaitingQueue();
    return this.enrichChatsBatch(chats);
  }

  async sendMessage(
    chatId,
    senderId,
    senderRole,
    data = {},
    guestSessionId = null,
  ) {
    const { content, isInternalNote, clientMessageId } = data;
    // FA-14: attachments are re-validated at the persistence sink with the
    // same strict rules as the update path - a caller bypassing the
    // controller cannot persist arbitrary attachment URLs.
    let attachments = data.attachments;
    if (attachments !== undefined) {
      const { validateChatAttachments } = require("../utils/chatAttachments");
      attachments = validateChatAttachments(attachments);
      if (attachments === null) throw new AppError("Invalid attachments", 400);
    }
    if (isInternalNote && senderRole !== "admin")
      throw new AppError("Only admins can create internal notes", 403);
    const GuestUserService = require("./guestUserService");

    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    })
      .select("_id customer guestSession status metadata")
      .lean();

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    // Authorization check for message sender
    const isAuthorized = await this.authorizeChat(
      chatId,
      senderId,
      senderRole,
      guestSessionId,
      chat,
    );
    if (!isAuthorized) {
      denyChatAccess(senderRole);
    }

    // For guest customers without senderId, use the system guest user placeholder
    let actualSenderId = senderId;
    let senderGuestSession;
    if (senderRole === "customer" && !senderId && guestSessionId) {
      const guest = await this.resolveGuestSession(guestSessionId);
      if (!guest) denyChatAccess(senderRole);
      senderGuestSession = guest._id;
      actualSenderId = await GuestUserService.getGuestUserId();
    }

    let messageType = "text";
    if (attachments && attachments.length > 0) {
      const hasImages = attachments.some((att) => att.fileType === "image");
      messageType = hasImages ? "image" : "file";
    }

    let message;
    try {
      message = await ChatMessage.create({
        chat: chatId,
        clientMessageId: clientMessageId || undefined,
        sender: actualSenderId,
        senderGuestSession,
        senderRole,
        messageType,
        isInternalNote: isInternalNote || false,
        content,
        attachments,
        deliveredAt: new Date(),
      });
    } catch (error) {
      // Normal sends pay no idempotency read. Only a retry that races/duplicates
      // performs the lookup after MongoDB's unique index rejects it.
      if (clientMessageId && error?.code === 11000) {
        const existing = await ChatMessage.findOne({
          chat: chatId,
          clientMessageId,
        }).lean();
        if (existing) return existing;
      }
      throw error;
    }

    if (isInternalNote) {
      await message.populate("sender", "firstName lastName role avatar");
      runtimeContext
        .getNotificationGateway()
        ?.io.to(`chat:${chatId}:admins`)
        .emit("chat:message:new", {
          chatId: String(chatId),
          message: message.toObject(),
          timestamp: new Date(),
        });
      return message.toObject();
    }

    // AR-38: shared bookkeeping (see applyMessageBookkeeping above) -
    // the chatV2 bot job runs the same path for bot replies.
    const didReopen = await applyMessageBookkeeping(
      chat,
      chatId,
      senderRole,
      senderId,
    );

    // If customer message reopened the chat, post a system message about AI reactivated
    if (didReopen) {
      setImmediate(async () => {
        try {
          const botUser = await User.findOne({ role: "admin" }).select("_id");
          if (botUser) {
            const sysMsg = await ChatMessage.create({
              chat: chatId,
              sender: botUser._id,
              senderRole: "bot",
              isAiGenerated: false,
              messageType: "text",
              content:
                "Conversation reopened. AI Assistant has been reactivated to assist you.",
              deliveredAt: new Date(),
            });
            if (runtimeContext.getNotificationGateway()) {
              const populated = await sysMsg.populate(
                "sender",
                "firstName lastName role avatar",
              );
              runtimeContext
                .getNotificationGateway()
                .io.to(`chat:${chatId.toString()}`)
                .emit("chat:message:new", {
                  chatId: chatId.toString(),
                  message: populated.toObject(),
                  timestamp: new Date(),
                });
            }
          }
        } catch (err) {
          console.error(
            "[CHAT-FIXES-9] Failed to send reopen system message:",
            err.message,
          );
        }
      });
    }

    // Broadcast message via socket if gateway is available
    if (runtimeContext.getNotificationGateway()) {
      const messageData = message.toObject();
      const roomId = chatId.toString();

      console.log(`Broadcasting message to room chat:${roomId}`);

      runtimeContext
        .getNotificationGateway()
        .io.to(`chat:${roomId}`)
        .emit("chat:message:new", {
          chatId: roomId,
          message: messageData,
          timestamp: new Date(),
        });

      // Broadcast status change socket events
      if (didReopen) {
        runtimeContext
          .getNotificationGateway()
          .io.to(`chat:${roomId}`)
          .emit("chat:status:changed", {
            chatId: roomId,
            status: "ai_handling",
            botActive: true,
          });
      } else if (
        senderRole === "admin" &&
        ["ai_handling", "escalated", "waiting", "active"].includes(chat.status)
      ) {
        runtimeContext
          .getNotificationGateway()
          .io.to(`chat:${roomId}`)
          .emit("chat:status:changed", {
            chatId: roomId,
            status: "agent_handling",
            botActive: false,
          });
      }
    }

    // Trigger chatbot response asynchronously if customer sent the message and chatbot is active
    // Wait: if it reopened, the bot is active now, so it should trigger!
    const updatedBotActive = didReopen
      ? true
      : !chat.metadata || chat.metadata.botActive !== false;
    if (senderRole === "customer" && updatedBotActive) {
      // AR-30 (D-B): the legacy chatOrchestrator pipeline was removed —
      // chatV2 is the only pipeline and CHAT_PIPELINE is inert.
      // Rollback is the git tag `pre-legacy-chat-removal`.
      const { queue, pipeline } = require("./chatV2");
      const retrievalService = require("./retrievalService");
      const roomId = chatId.toString();
      queue.resume(roomId);
      queue
        .enqueue(roomId, async () => {
          const latest = await Chat.findById(chatId)
            .select("status metadata customer")
            .lean();
          if (
            !latest ||
            latest.status === "agent_handling" ||
            latest.status === "closed"
          )
            return;
          const emit = (event, payload = {}) =>
            runtimeContext
              .getNotificationGateway()
              ?.io.to(`chat:${roomId}`)
              .emit(event, { chatId: roomId, ...payload });
          let thinkingStarted = false;
          try {
            emit("ai:thinking_start");
            thinkingStarted = true;
            const result = await pipeline.run({
              chatId,
              text: content,
              productOptions: latest.metadata?.lastProductOptions || [],
              context: {
                // FA-07/FA-13: identity fields come from
                // buildV2TurnIdentity — the chat's server-side customer
                // record (null for guests) plus the guest session id
                // carried separately as the registry's lookup-throttle
                // key (commit-audit C-4); never from the model.
                ...buildV2TurnIdentity({
                  customer: latest.customer,
                  guestSessionId,
                }),
                chatId: roomId,
                handoff: async (reason) => {
                  await Chat.updateOne(
                    { _id: chatId, status: "ai_handling" },
                    {
                      $set: {
                        status: "escalated",
                        "metadata.botActive": false,
                        "metadata.handoffReason": String(reason).slice(0, 500),
                      },
                    },
                  );
                  queue.cancel(roomId);
                  emit("chat:status:changed", {
                    status: "escalated",
                    botActive: false,
                  });
                  return { ok: true, status: "escalated" };
                },
                // AR-39: the RAG embedding budget is configurable via
                // RAG_EMBEDDING_TIMEOUT_MS (see retrievalService
                // .embeddingTimeoutMs); its default is 250 — the value
                // that used to be hard-coded here.
                retrieve: async (query) =>
                  retrievalService.retrieveContext(query, {
                    timeoutMs: retrievalService.embeddingTimeoutMs(),
                  }),
              },
              onToken: null,
            });
            if (
              Array.isArray(result.productOptions) &&
              result.productOptions.length
            ) {
              await Chat.updateOne(
                { _id: chatId },
                {
                  $set: {
                    "metadata.lastProductOptions": result.productOptions.slice(
                      0,
                      5,
                    ),
                  },
                },
              );
            }
            const stillAi = await Chat.exists({
              _id: chatId,
              status: "ai_handling",
            });
            if (!stillAi) return;
            const botMessage = await ChatMessage.create({
              chat: chatId,
              senderRole: "bot",
              messageType: "text",
              isAiGenerated: true,
              content: result.text,
              deliveredAt: new Date(),
            });
            // AR-38: the v2 job previously skipped sendMessage's
            // bookkeeping entirely - lastMessageAt stayed at the
            // customer's message (chat lists mis-ordered), the bot
            // never marked the customer's messages read, and no
            // chat:messages:read was broadcast. Run the shared path;
            // the bot message stays sender-less in storage, so the
            // read broadcast carries userId null (see CLIENT_IMPACT.md).
            await applyMessageBookkeeping(latest, chatId, "bot", null);
            emit("chat:message:new", { message: botMessage.toObject() });
            emit("ai:complete", {
              messageId: botMessage._id,
              degraded: !!result.degraded,
            });
          } catch (error) {
            emit("ai:error", { message: "Assistant temporarily unavailable" });
          } finally {
            if (thinkingStarted) emit("ai:thinking_stop");
          }
        })
        .catch((error) =>
          console.error("chat_v2_turn_failed", {
            chatId: roomId,
            error: error.message,
          }),
        );
      return message.toObject();
    }

    return message.toObject();
  }

  async getChatMessages(
    chatId,
    userId,
    userRole,
    guestSessionId,
    options = {},
  ) {
    // One projected lean ownership read. The previous implementation loaded the chat
    // and then authorizeChat() loaded it a second time on every history request.
    const chat = await Chat.findOne({ _id: chatId, deletedAt: null })
      .select("_id customer guestSession")
      .lean();
    if (!chat) throw new AppError("Chat not found", 404);

    const isAuthorized = await this.authorizeChat(
      chatId,
      userId,
      userRole,
      guestSessionId,
      chat,
    );
    if (!isAuthorized) denyChatAccess(userRole);
    return ChatMessage.getChatMessages(chatId, {
      ...options,
      includeInternalNotes: userRole === "admin",
      includeSenderEmail: userRole === "admin",
    });
  }

  async markMessagesAsRead(chatId, userId, userRole, guestSessionId) {
    const chat = await Chat.findOne({ _id: chatId, deletedAt: null })
      .select("_id customer guestSession")
      .lean();
    if (!chat) throw new AppError("Chat not found", 404);

    const isAuthorized = await this.authorizeChat(
      chatId,
      userId,
      userRole,
      guestSessionId,
      chat,
    );
    if (!isAuthorized) {
      denyChatAccess(userRole);
    }

    const now = new Date();
    const readUpdate =
      userRole === "customer"
        ? { lastReadCustomerAt: now, unreadCountCustomer: 0 }
        : { lastReadAdminAt: now, unreadCountAdmin: 0 };
    // Independent writes run concurrently instead of adding two sequential DB RTTs.
    const [modifiedCount] = await Promise.all([
      ChatMessage.markAsRead(chatId, userRole),
      Chat.updateOne({ _id: chatId }, { $set: readUpdate }),
    ]);

    // Broadcast read status via socket
    if (runtimeContext.getNotificationGateway()) {
      const roomId = chatId.toString();
      runtimeContext
        .getNotificationGateway()
        .io.to(`chat:${roomId}`)
        .emit("chat:messages:read", {
          chatId: roomId,
          userId,
          userRole,
          readAt: now,
        });
    }

    return { modifiedCount };
  }

  async updateTypingStatus(chatId, userId, userRole, guestSessionId, isTyping) {
    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    });

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    // Authorization check
    const isAuthorized = await this.authorizeChat(
      chatId,
      userId,
      userRole,
      guestSessionId,
    );
    if (!isAuthorized) {
      denyChatAccess(userRole);
    }

    // Typing is ephemeral presence, not durable business state. Persisting every
    // keystroke to Mongo adds write latency/load and provides no recovery value.
    // Broadcast typing status via socket
    if (runtimeContext.getNotificationGateway()) {
      const roomId = chatId.toString();
      runtimeContext
        .getNotificationGateway()
        .io.to(`chat:${roomId}`)
        .emit("chat:typing:status", {
          chatId: roomId,
          isTyping,
          userRole,
        });
    }

    return { success: true };
  }

  async closeChat(chatId, userId, userRole, guestSessionId) {
    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    });

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    // Authorization check
    const isAuthorized = await this.authorizeChat(
      chatId,
      userId,
      userRole,
      guestSessionId,
      chat,
    );
    if (!isAuthorized) {
      denyChatAccess(userRole);
    }

    chat.status = "closed";
    chat.closedBy = userId;
    await chat.save();

    // Broadcast close event via socket
    if (runtimeContext.getNotificationGateway()) {
      const roomId = chatId.toString();
      runtimeContext
        .getNotificationGateway()
        .io.to(`chat:${roomId}`)
        .emit("chat:closed", {
          chatId: roomId,
          closedBy: userId,
          closedAt: new Date(),
        });
    }

    return chat;
  }

  async resolveChat(chatId, userId) {
    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    })
      .select("_id customer guestSession")
      .lean();

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    const resolvedAt = new Date();
    const resolved = await Chat.findByIdAndUpdate(
      chatId,
      { $set: { status: "resolved", closedBy: userId, closedAt: resolvedAt } },
      { returnDocument: "after" },
    ).lean();

    // Broadcast resolve event via socket
    if (runtimeContext.getNotificationGateway()) {
      const roomId = chatId.toString();
      runtimeContext
        .getNotificationGateway()
        .io.to(`chat:${roomId}`)
        .emit("chat:resolved", {
          chatId: roomId,
          resolvedBy: userId,
          resolvedAt: new Date(),
        });
    }

    return resolved;
  }

  async getChatStats() {
    const [
      totalChats,
      aiHandlingChats,
      escalatedChats,
      agentHandlingChats,
      resolvedChats,
      closedChats,
    ] = await Promise.all([
      Chat.countDocuments({ deletedAt: null }),
      Chat.countDocuments({ status: "ai_handling", deletedAt: null }),
      Chat.countDocuments({ status: "escalated", deletedAt: null }),
      Chat.countDocuments({ status: "agent_handling", deletedAt: null }),
      Chat.countDocuments({ status: "resolved", deletedAt: null }),
      Chat.countDocuments({ status: "closed", deletedAt: null }),
    ]);

    // AR-16: see firstAdminResponsePipeline above — the average is
    // computed over chatmessages (first admin reply per chat) with only
    // a per-chat $lookup back to chats, instead of materializing every
    // message of every chat via a chats-side $lookup.
    const chatsWithResponses = await ChatMessage.aggregate(
      firstAdminResponsePipeline(),
    );

    const avgResponseTimeMs =
      chatsWithResponses.length > 0
        ? chatsWithResponses[0].avgResponseTime
        : null;
    const avgResponseTimeMinutes = avgResponseTimeMs
      ? Math.round(avgResponseTimeMs / 1000 / 60)
      : null;

    return {
      totalChats,
      waitingChats: escalatedChats,
      activeChats: aiHandlingChats + agentHandlingChats,
      aiHandlingChats,
      agentHandlingChats,
      resolvedChats,
      closedChats,
      avgResponseTimeMinutes,
    };
  }

  async getUnreadCount(chatId, userRole) {
    return ChatMessage.getUnreadCount(chatId, userRole);
  }

  // ---------------------------------------------------------------------------
  // Support hours helper (CHAT-FIXES-8 Fix 2)
  // ---------------------------------------------------------------------------
  _isSupportOnline() {
    const now = new Date();
    const hour = now.getHours(); // server local time
    return hour >= 9 && hour < 18; // 9 AM – 6 PM
  }

  async toggleBot(chatId, userId, role, guestSessionId, botActive) {
    const chat = await Chat.findOne({ _id: chatId, deletedAt: null });
    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    // Authorization check
    const isAuthorized = await this.authorizeChat(
      chatId,
      userId,
      role,
      guestSessionId,
    );
    if (!isAuthorized) {
      denyChatAccess(role);
    }

    chat.metadata = {
      ...(chat.metadata || {}),
      botActive: botActive,
    };

    if (!botActive) {
      chat.status = "escalated"; // Escalate to human queue
      chat.metadata.escalatedAt = new Date();
      chat.metadata.escalationReason = "customer switched to human agent";
    } else {
      chat.status = "ai_handling";
    }

    await chat.save();

    // On escalation (bot deactivated by customer), post an instant, templated system acknowledgment
    if (!botActive) {
      try {
        // Context-aware acknowledgment based on support hours
        const online = this._isSupportOnline();
        const availabilityLine = online
          ? "An agent will be with you shortly."
          : "Our support team is currently offline. Our hours are 9:00 AM to 6:00 PM — we'll respond as soon as we're back online, and you'll be notified here.";

        const ackContent = `Thanks for reaching out — I've let our support team know you'd like to speak with someone, and you're in the queue. Feel free to add any extra details here in the meantime. ${availabilityLine}`;

        // Find bot/admin sender for system message
        const botUser = await User.findOne({ role: "admin" }).select("_id");
        if (botUser) {
          await ChatMessage.create({
            chat: chatId,
            sender: botUser._id,
            senderRole: "bot",
            isAiGenerated: true,
            messageType: "text",
            content: ackContent,
            deliveredAt: new Date(),
          });

          // Broadcast the acknowledgment message via socket
          if (runtimeContext.getNotificationGateway()) {
            const roomId = chatId.toString();
            const ackMsg = await ChatMessage.findOne({
              chat: chatId,
              content: ackContent,
            })
              .sort({ createdAt: -1 })
              .populate("sender", "firstName lastName role avatar");
            if (ackMsg) {
              runtimeContext
                .getNotificationGateway()
                .io.to(`chat:${roomId}`)
                .emit("chat:message:new", {
                  chatId: roomId,
                  message: ackMsg.toObject(),
                  timestamp: new Date(),
                });
            }
          }
        }
      } catch (err) {
        console.error(
          "[CHAT-FIXES-9] Failed to send escalation acknowledgment message:",
          err.message,
        );
      }
    }

    // Broadcast status change
    if (runtimeContext.getNotificationGateway()) {
      const roomId = chatId.toString();
      runtimeContext
        .getNotificationGateway()
        .io.to(`chat:${roomId}`)
        .emit("chat:status:changed", {
          chatId: roomId,
          status: chat.status,
          botActive: botActive,
        });
    }

    return chat;
  }
}

module.exports = new ChatService();
module.exports.buildV2TurnIdentity = buildV2TurnIdentity;
module.exports._firstAdminResponsePipeline = firstAdminResponsePipeline;
