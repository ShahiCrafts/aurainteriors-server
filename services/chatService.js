const Chat = require("../models/chat.model");
const ChatMessage = require("../models/chatMessage.model");
const GuestSession = require("../models/guestSession.model");
const AppError = require("../utils/AppError");
const notificationEventEmitter = require("./notificationEventEmitter");
const User = require("../models/user.model");

class ChatService {

  async resolveGuestSession(guestSessionId) {
    if (!guestSessionId) return null;

    const value = String(guestSessionId).trim();
    if (!value) return null;

    // Public browser identity is GuestSession.sessionId. Never pass an arbitrary
    // public value to findById(), because Mongoose will throw a CastError.
    let guestSession = await GuestSession.findOne({ sessionId: value }).select("_id sessionId").lean();

    // Backward compatibility for browsers that stored the Mongo _id previously.
    if (!guestSession && /^[a-fA-F0-9]{24}$/.test(value)) {
      guestSession = await GuestSession.findById(value).select("_id sessionId").lean();
    }

    return guestSession;
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
        const customer = await User.findById(customerId).select("firstName lastName email").lean();
        notificationEventEmitter.emit("admin:chat:started", {
          chatId: chat._id,
          customerName: customer ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() : null,
          customerEmail: customer?.email,
          subject,
        });
      } catch (error) {
        console.error("Failed to emit admin:chat:started event:", error.message);
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
    // Legacy clients may still hold the Mongo ObjectId, so support both formats.
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
          { $addToSet: { chats: chat._id }, $set: { lastActivityAt: new Date() } }
        );
      } catch (error) {
        console.error("Guest chat background bookkeeping failed:", error.message);
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
      { $set: {
        _customerCutoff: { $switch: { branches: customerCutoffBranches, default: new Date(0) } },
        _adminCutoff: { $switch: { branches: adminCutoffBranches, default: new Date(0) } },
      } },
      { $group: {
        _id: "$chat",
        lastMessage: { $first: { content: "$content", messageType: "$messageType" } },
        unreadCountCustomer: { $sum: { $cond: [
          { $and: [
            { $in: ["$senderRole", ["admin", "bot"]] },
            { $gt: ["$createdAt", "$_customerCutoff"] },
          ] }, 1, 0
        ] } },
        unreadCountAdmin: { $sum: { $cond: [
          { $and: [
            { $eq: ["$senderRole", "customer"] },
            { $gt: ["$createdAt", "$_adminCutoff"] },
          ] }, 1, 0
        ] } },
      } },
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
  async authorizeChat(chatId, userId, userRole, guestSessionId, loadedChat = null) {
    const chat = loadedChat || await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    });

    if (!chat) {
      return false;
    }

    // Admin and bot can access any chat
    if (["admin", "bot"].includes(userRole)) {
      return true;
    }

    // Authenticated customer accessing their own chat
    if (userId && chat.customer && chat.customer.toString() === userId.toString()) {
      return true;
    }

    // Guest accessing their own chat via the public session key. Resolve it to
    // the internal Mongo ObjectId before comparing ownership.
    if (guestSessionId && chat.guestSession) {
      const guestSession = await this.resolveGuestSession(guestSessionId);
      if (guestSession && chat.guestSession.toString() === guestSession._id.toString()) {
        return true;
      }
    }

    return false;
  }

  async getChatById(chatId, userId, userRole, guestSessionId) {
    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    }).populate("customer", "firstName lastName email avatar").lean();

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    // Authorization check
    const isAuthorized = await this.authorizeChat(chatId, userId, userRole, guestSessionId, chat);
    if (!isAuthorized) {
      throw new AppError("You are not authorized to view this chat", 403);
    }

    return this.enrichChatWithUnreadCounts(chat);
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

  async sendMessage(chatId, senderId, senderRole, data = {}, guestSessionId = null) {
    const { content, attachments, isInternalNote, clientMessageId } = data;
    const GuestUserService = require("./guestUserService");

    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    }).select("_id customer guestSession status metadata").lean();

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    // Authorization check for message sender
    const isAuthorized = await this.authorizeChat(chatId, senderId, senderRole, guestSessionId, chat);
    if (!isAuthorized) {
      throw new AppError("You are not authorized to message this chat", 403);
    }

    // For guest customers without senderId, use the system guest user placeholder
    let actualSenderId = senderId;
    if (senderRole === 'customer' && !senderId && guestSessionId) {
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
        const existing = await ChatMessage.findOne({ chat: chatId, clientMessageId }).lean();
        if (existing) return existing;
      }
      throw error;
    }

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
      if (global.notificationGateway) {
        const roomId = chatId.toString();
        global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:messages:read", {
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
      if (["ai_handling", "escalated", "waiting", "active"].includes(chat.status)) {
        updateData.status = "agent_handling";
      }
    }

    const chatUpdatePromise = Chat.updateOne({ _id: chatId }, { $set: updateData }).catch((error) => {
      console.error("Chat metadata update failed:", error.message);
    });

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
            content: "Conversation reopened. AI Assistant has been reactivated to assist you.",
            deliveredAt: new Date(),
          });
          if (global.notificationGateway) {
            const populated = await sysMsg.populate("sender", "firstName lastName email role avatar");
            global.notificationGateway.io.to(`chat:${chatId.toString()}`).emit("chat:message:new", {
              chatId: chatId.toString(),
              message: populated.toObject(),
              timestamp: new Date(),
            });
          }
        }
      } catch (err) {
        console.error("[CHAT-FIXES-9] Failed to send reopen system message:", err.message);
      }
      });
    }

    // Broadcast message via socket if gateway is available
    if (global.notificationGateway) {
      const messageData = message.toObject();
      const roomId = chatId.toString();

      console.log(`Broadcasting message to room chat:${roomId}`);

      global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:message:new", {
        chatId: roomId,
        message: messageData,
        timestamp: new Date(),
      });

      // Broadcast status change socket events
      if (didReopen) {
        global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:status:changed", {
          chatId: roomId,
          status: "ai_handling",
          botActive: true,
        });
      } else if (senderRole === "admin" && ["ai_handling", "escalated", "waiting", "active"].includes(chat.status)) {
        global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:status:changed", {
          chatId: roomId,
          status: "agent_handling",
          botActive: false,
        });
      }
    }

    // Trigger chatbot response asynchronously if customer sent the message and chatbot is active
    // Wait: if it reopened, the bot is active now, so it should trigger!
    const updatedBotActive = didReopen ? true : (!chat.metadata || chat.metadata.botActive !== false);
    if (senderRole === "customer" && updatedBotActive) {
      if (process.env.CHAT_PIPELINE !== "legacy") {
        const { queue, pipeline } = require("./chatV2");
        const retrievalService = require("./retrievalService");
        const roomId = chatId.toString();
        queue.resume(roomId);
        queue.enqueue(roomId, async () => {
          const latest = await Chat.findById(chatId).select("status metadata customer").lean();
          if (!latest || latest.status === "agent_handling" || latest.status === "closed") return;
          const emit = (event, payload = {}) => global.notificationGateway?.io.to(`chat:${roomId}`).emit(event, { chatId: roomId, ...payload });
          let thinkingStarted = false;
          try {
            emit("ai:thinking_start");
            thinkingStarted = true;
            const result = await pipeline.run({
              chatId, text: content, productOptions: latest.metadata?.lastProductOptions || [],
              context: {
                userId: latest.customer?.toString() || null,
                handoff: async (reason) => {
                  await Chat.updateOne({ _id: chatId, status: "ai_handling" }, { $set: { status: "escalated", "metadata.botActive": false, "metadata.handoffReason": String(reason).slice(0,500) } });
                  queue.cancel(roomId);
                  emit("chat:status:changed", { status: "escalated", botActive: false });
                  return { ok: true, status: "escalated" };
                },
                retrieve: async (query) => retrievalService.retrieveContext(query, { timeoutMs: 250 }),
              },
              onToken: null,
            });
            if (Array.isArray(result.productOptions) && result.productOptions.length) {
              await Chat.updateOne({ _id: chatId }, { $set: { 'metadata.lastProductOptions': result.productOptions.slice(0, 5) } });
            }
            const stillAi = await Chat.exists({ _id: chatId, status: "ai_handling" });
            if (!stillAi) return;
            const botMessage = await ChatMessage.create({ chat: chatId, senderRole: "bot", messageType: "text", isAiGenerated: true, content: result.text, deliveredAt: new Date() });
            emit("chat:message:new", { message: botMessage.toObject() });
            emit("ai:complete", { messageId: botMessage._id, degraded: !!result.degraded });
          } catch (error) {
            emit("ai:error", { message: "Assistant temporarily unavailable" });
          } finally {
            if (thinkingStarted) emit("ai:thinking_stop");
          }
        }).catch(error => console.error("chat_v2_turn_failed", { chatId: roomId, error: error.message }));
        return message.toObject();
      }
      (async () => {
        try {
          // Get admin/bot user record (system agent)
          const botUser = await User.findOne({ role: "admin" }).select("_id email");
          const botUserId = botUser ? botUser._id : actualSenderId;

          // AI reads the customer's message right before processing it
          await ChatMessage.markAsRead(chatId, "admin");
          await Chat.findByIdAndUpdate(chatId, { lastReadAdminAt: new Date() });

          if (global.notificationGateway) {
            const roomId = chatId.toString();
            global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:messages:read", {
              chatId: roomId,
              userId: botUserId,
              userRole: "admin",
            });
          }

          // Call Orchestrator — it owns the ai:thinking_start/stop/error indicator lifecycle
          const chatOrchestrator = require("./chatOrchestrator");
          const customerUser = await User.findById(actualSenderId).select("email");
          const customerEmail = customerUser ? customerUser.email : null;
          const customerId = actualSenderId ? actualSenderId.toString() : null;

          const responseText = await chatOrchestrator.handleUserMessage(
            chatId, content, customerEmail, customerId
          );

          // Bot response: only pass guestSessionId if this is a guest chat
          await this.sendMessage(chatId, botUserId, "bot", {
            content: responseText
          }, senderRole === 'customer' && !senderId ? guestSessionId : null);
        } catch (error) {
          console.error("Chatbot processing error:", error.message);
        }
      })();
    }

    return message.toObject();
  }

  async getChatMessages(chatId, userId, userRole, guestSessionId, options = {}) {
    // One projected lean ownership read. The previous implementation loaded the chat
    // and then authorizeChat() loaded it a second time on every history request.
    const chat = await Chat.findOne({ _id: chatId, deletedAt: null })
      .select("_id customer guestSession")
      .lean();
    if (!chat) throw new AppError("Chat not found", 404);

    const isAuthorized = await this.authorizeChat(chatId, userId, userRole, guestSessionId, chat);
    if (!isAuthorized) throw new AppError("You are not authorized to view these messages", 403);
    return ChatMessage.getChatMessages(chatId, options);
  }

  async markMessagesAsRead(chatId, userId, userRole, guestSessionId) {
    const chat = await Chat.findOne({ _id: chatId, deletedAt: null })
      .select("_id customer guestSession")
      .lean();
    if (!chat) throw new AppError("Chat not found", 404);

    const isAuthorized = await this.authorizeChat(chatId, userId, userRole, guestSessionId, chat);
    if (!isAuthorized) {
      throw new AppError("You are not authorized to mark these messages", 403);
    }

    const now = new Date();
    const readUpdate = userRole === "customer"
      ? { lastReadCustomerAt: now, unreadCountCustomer: 0 }
      : { lastReadAdminAt: now, unreadCountAdmin: 0 };
    // Independent writes run concurrently instead of adding two sequential DB RTTs.
    const [modifiedCount] = await Promise.all([
      ChatMessage.markAsRead(chatId, userRole),
      Chat.updateOne({ _id: chatId }, { $set: readUpdate }),
    ]);

    // Broadcast read status via socket
    if (global.notificationGateway) {
      const roomId = chatId.toString();
      global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:messages:read", {
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
    const isAuthorized = await this.authorizeChat(chatId, userId, userRole, guestSessionId);
    if (!isAuthorized) {
      throw new AppError("You are not authorized to update this chat", 403);
    }

    // Typing is ephemeral presence, not durable business state. Persisting every
    // keystroke to Mongo adds write latency/load and provides no recovery value.
    // Broadcast typing status via socket
    if (global.notificationGateway) {
      const roomId = chatId.toString();
      global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:typing:status", {
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
    const isAuthorized = await this.authorizeChat(chatId, userId, userRole, guestSessionId, chat);
    if (!isAuthorized) {
      throw new AppError("You are not authorized to close this chat", 403);
    }

    chat.status = "closed";
    chat.closedBy = userId;
    await chat.save();

    // Broadcast close event via socket
    if (global.notificationGateway) {
      const roomId = chatId.toString();
      global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:closed", {
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
    }).select("_id customer guestSession").lean();

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    const resolvedAt = new Date();
    const resolved = await Chat.findByIdAndUpdate(
      chatId,
      { $set: { status: "resolved", closedBy: userId, closedAt: resolvedAt } },
      { new: true }
    ).lean();

    // Broadcast resolve event via socket
    if (global.notificationGateway) {
      const roomId = chatId.toString();
      global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:resolved", {
        chatId: roomId,
        resolvedBy: userId,
        resolvedAt: new Date(),
      });
    }

    return resolved;
  }

  async getChatStats() {
    const [totalChats, aiHandlingChats, escalatedChats, agentHandlingChats, resolvedChats, closedChats] =
      await Promise.all([
        Chat.countDocuments({ deletedAt: null }),
        Chat.countDocuments({ status: "ai_handling", deletedAt: null }),
        Chat.countDocuments({ status: "escalated", deletedAt: null }),
        Chat.countDocuments({ status: "agent_handling", deletedAt: null }),
        Chat.countDocuments({ status: "resolved", deletedAt: null }),
        Chat.countDocuments({ status: "closed", deletedAt: null }),
      ]);

    const chatsWithResponses = await Chat.aggregate([
      {
        $match: {
          status: { $in: ["ai_handling", "escalated", "agent_handling", "resolved", "closed"] },
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: "chatmessages",
          localField: "_id",
          foreignField: "chat",
          as: "messages",
        },
      },
      {
        $project: {
          createdAt: 1,
          firstAdminMessage: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$messages",
                  as: "msg",
                  cond: { $eq: ["$$msg.senderRole", "admin"] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $match: {
          "firstAdminMessage.createdAt": { $exists: true },
        },
      },
      {
        $project: {
          responseTime: {
            $subtract: ["$firstAdminMessage.createdAt", "$createdAt"],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: "$responseTime" },
        },
      },
    ]);

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
    const isAuthorized = await this.authorizeChat(chatId, userId, role, guestSessionId);
    if (!isAuthorized) {
      throw new AppError("You are not authorized to update this chat", 403);
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
          if (global.notificationGateway) {
            const roomId = chatId.toString();
            const ackMsg = await ChatMessage.findOne({ chat: chatId, content: ackContent })
              .sort({ createdAt: -1 })
              .populate("sender", "firstName lastName email role avatar");
            if (ackMsg) {
              global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:message:new", {
                chatId: roomId,
                message: ackMsg.toObject(),
                timestamp: new Date(),
              });
            }
          }
        }
      } catch (err) {
        console.error("[CHAT-FIXES-9] Failed to send escalation acknowledgment message:", err.message);
      }
    }

    // Broadcast status change
    if (global.notificationGateway) {
      const roomId = chatId.toString();
      global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:status:changed", {
        chatId: roomId,
        status: chat.status,
        botActive: botActive,
      });
    }

    return chat;
  }
}

module.exports = new ChatService();
