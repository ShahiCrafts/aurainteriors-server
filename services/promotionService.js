const Promotion = require("../models/promotion.model");
const User = require("../models/user.model");
const NotificationService = require("./notificationService");
const AppError = require("../utils/AppError");
const { stripHtmlTags } = require("../utils/escapeHtml");

class PromotionService {
  async createPromotion(promotionData, adminId) {
    const {
      title,
      description,
      shortDescription,
      targetAudience,
      scheduledAt,
      discount,
      actionUrl,
      imageUrl,
      priority,
      tags,
      expiresAt,
    } = promotionData;

    const promotion = new Promotion({
      title,
      description,
      shortDescription: shortDescription || description.substring(0, 200),
      targetAudience: targetAudience || { type: "subscribers" },
      scheduledAt: scheduledAt || null,
      discount,
      actionUrl,
      imageUrl,
      priority: priority || "normal",
      tags: tags || [],
      expiresAt,
      createdBy: adminId,
      status: scheduledAt ? "scheduled" : "draft",
    });

    await promotion.save();
    return promotion;
  }

  async updatePromotion(promotionId, updateData) {
    const promotion = await Promotion.findById(promotionId);

    if (!promotion) {
      throw new AppError("Promotion not found", 404);
    }

    if (!promotion.canEdit) {
      throw new AppError(
        "Cannot edit a promotion that has already been sent",
        400
      );
    }

    const allowedFields = [
      "title",
      "description",
      "shortDescription",
      "targetAudience",
      "scheduledAt",
      "discount",
      "actionUrl",
      "imageUrl",
      "priority",
      "tags",
      "expiresAt",
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        promotion[field] = updateData[field];
      }
    });

    if (updateData.scheduledAt && promotion.status === "draft") {
      promotion.status = "scheduled";
    }

    await promotion.save();
    return promotion;
  }

  async getTargetUsers(targetAudience) {
    const { type, categories, userIds } = targetAudience;

    let query = { isActive: true };

    switch (type) {
      case "all":
        break;

      case "subscribers":
        query["preferences.promotionalEmails"] = true;
        break;

      case "category":
        if (categories && categories.length > 0) {
          query["preferences.preferredCategories"] = { $in: categories };
        }
        break;

      case "custom":
        if (userIds && userIds.length > 0) {
          return userIds;
        }
        return [];

      default:
        throw new AppError("Invalid target audience type", 400);
    }

    const users = await User.find(query).select("_id").lean();
    return users.map((u) => u._id);
  }

  async sendPromotion(promotionId) {
    // AR-04: BROADCAST_MODE=queue enqueues a durable job and returns
    // immediately WITHOUT claiming/sending; the worker's handler runs
    // performPromotionSend. Inline (default) is the current behavior.
    const broadcastJobs = require("./broadcastJobs.service");
    if (broadcastJobs.isQueueMode()) {
      const job = await broadcastJobs.enqueuePromotion(promotionId);
      return { queued: true, jobId: job._id, message: "Promotion queued for sending" };
    }
    return this.performPromotionSend(promotionId);
  }

  async performPromotionSend(promotionId) {
    // FA-70: claim the "sending" state ATOMICALLY - two concurrent sends
    // can no longer both pass the status check and double-broadcast.
    const prior = await Promotion.findById(promotionId).select("status").lean();
    if (!prior) throw new AppError("Promotion not found", 404);
    if (prior.status === "sent") throw new AppError("This promotion has already been sent", 400);
    if (prior.status === "cancelled") throw new AppError("Cannot send a cancelled promotion", 400);

    const promotion = await Promotion.findOneAndUpdate(
      { _id: promotionId, status: { $in: ["draft", "scheduled"] } },
      { $set: { status: "sending" } },
      { new: true }
    );
    if (!promotion) throw new AppError("This promotion is already being sent", 409);
    await promotion.populate("discount", "code discountPercentage");
    await promotion.populate("createdBy", "firstName lastName");

    const previousStatus = prior.status;

    try {
      const targetUserIds = await this.getTargetUsers(promotion.targetAudience);
      promotion.metrics.targetCount = targetUserIds.length;

      if (targetUserIds.length === 0) {
        promotion.status = "sent";
        promotion.sentAt = new Date();
        await promotion.save();
        return {
          success: true,
          message: "No users matched the target criteria",
          metrics: promotion.metrics,
        };
      }

      const notificationData = {
        // FA-12: promotion copy is plain text in notifications - strip
        // any markup an author pasted so it cannot render as HTML in
        // notification UIs or email digests.
        title: stripHtmlTags(promotion.title),
        message: stripHtmlTags(promotion.shortDescription || promotion.description),
        expiresAt: promotion.expiresAt,
        type: "promotional",
        category: "promotion",
        priority: promotion.priority,
        actionUrl: promotion.actionUrl,
        data: {
          promotionId: promotion._id,
          discountCode: promotion.discount?.code,
          discountPercentage: promotion.discount?.discountPercentage,
          imageUrl: promotion.imageUrl,
          fullDescription: promotion.description,
        },
        metadata: {
          source: "promotion_service",
          triggeringEvent: "promotional_campaign",
          campaignId: promotion._id.toString(),
        },
        idempotencyKey: `promo-${promotion._id}`,
      };

      const result = await this.broadcastPromotionToUsers(
        notificationData,
        targetUserIds,
        promotion._id
      );

      promotion.metrics.sentCount = result.sentCount;
      promotion.metrics.failedCount = result.failedCount;
      if (result.failedCount) throw new AppError("Some promotion notifications could not be persisted; retry required", 503);
      promotion.status = "sent";
      promotion.sentAt = new Date();
      promotion.notification = result.notificationId;
      await promotion.save();

      return {
        success: true,
        message: `Promotion sent to ${result.sentCount} users`,
        metrics: promotion.metrics,
      };
    } catch (error) {
      promotion.status = previousStatus === "scheduled" ? "scheduled" : "draft";
      await promotion.save();
      throw error;
    }
  }

  async broadcastPromotionToUsers(notificationData, userIds, promotionId) {
    return NotificationService.broadcastNotification(notificationData, userIds);
  }

  async schedulePromotion(promotionId, scheduledAt) {
    const promotion = await Promotion.findById(promotionId);

    if (!promotion) {
      throw new AppError("Promotion not found", 404);
    }

    if (!promotion.canEdit) {
      throw new AppError(
        "Cannot schedule a promotion that has already been sent",
        400
      );
    }

    if (new Date(scheduledAt) < new Date()) {
      throw new AppError("Scheduled time must be in the future", 400);
    }

    promotion.scheduledAt = scheduledAt;
    promotion.status = "scheduled";
    await promotion.save();

    return promotion;
  }

  async cancelPromotion(promotionId) {
    const promotion = await Promotion.findById(promotionId);

    if (!promotion) {
      throw new AppError("Promotion not found", 404);
    }

    if (promotion.status === "sent") {
      throw new AppError(
        "Cannot cancel a promotion that has already been sent",
        400
      );
    }

    promotion.status = "cancelled";
    await promotion.save();

    return promotion;
  }

  async getAllPromotions(options = {}) {
    const { status } = options;
    // AR-19: bound pagination to the house contract (see
    // announcementService.getAllAnnouncements / CLIENT_IMPACT.md).
    const { boundedPage, boundedLimit } = require("../utils/listQuery");
    const page = boundedPage(options.page);
    const limit = boundedLimit(options.limit, 20);

    const query = {};
    // FA-56: coerce at the sink.
    const { asEnum } = require("../utils/params");
    const statusC = asEnum(status, ["draft", "scheduled", "sending", "sent", "cancelled"]);
    if (statusC !== undefined) {
      query.status = statusC;
    }

    const [promotions, total] = await Promise.all([
      Promotion.find(query)
        .populate("createdBy", "firstName lastName email")
        .populate("discount", "code discountPercentage")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Promotion.countDocuments(query),
    ]);

    return {
      promotions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPromotionById(promotionId) {
    const promotion = await Promotion.findById(promotionId)
      .populate("createdBy", "firstName lastName email")
      .populate("discount", "code discountPercentage expiryDate");

    if (!promotion) {
      throw new AppError("Promotion not found", 404);
    }

    return promotion;
  }

  async deletePromotion(promotionId) {
    const promotion = await Promotion.findById(promotionId);

    if (!promotion) {
      throw new AppError("Promotion not found", 404);
    }

    if (promotion.status === "sending") {
      throw new AppError(
        "Cannot delete a promotion that is currently sending",
        400
      );
    }

    await promotion.deleteOne();
  }

  async processScheduledPromotions() {
    const scheduledPromotions = await Promotion.getScheduledCampaignsToSend();

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
    };

    for (const promotion of scheduledPromotions) {
      results.processed++;
      try {
        await this.sendPromotion(promotion._id);
        results.succeeded++;
      } catch (error) {
        console.error(
          `Failed to send scheduled promotion ${promotion._id}:`,
          error.message
        );
        results.failed++;
      }
    }

    return results;
  }

  async trackEngagement(promotionId, action, userId = null) {
    const fieldMap = {
      delivered: "deliveredCount",
      read: "readCount",
      clicked: "clickCount",
    };

    const field = fieldMap[action];
    if (!field) {
      return;
    }

    // FA-55: engagement counts only for users the promotion was actually
    // delivered to (a delivery notification exists for the recipient).
    // Unbound calls used to let any account inflate any campaign's metrics.
    if (userId) {
      const Notification = require("../models/notification.model");
      const delivered = await Notification.exists({ recipient: userId, "data.promotionId": promotionId });
      if (!delivered) return;
    }

    // Atomic $inc (C-09): the previous findById + updateMetrics
    // read-modify-write lost concurrent increments. A missing
    // promotion stays a silent no-op, as before.
    await Promotion.findByIdAndUpdate(promotionId, {
      $inc: { [`metrics.${field}`]: 1 },
    });
  }

  async getPromotionAnalytics(promotionId) {
    const promotion = await Promotion.findById(promotionId).populate(
      "discount",
      "code currentUsageCount"
    );

    if (!promotion) {
      throw new AppError("Promotion not found", 404);
    }

    return {
      campaign: {
        title: promotion.title,
        status: promotion.status,
        sentAt: promotion.sentAt,
      },
      metrics: {
        targetCount: promotion.metrics.targetCount,
        sentCount: promotion.metrics.sentCount,
        deliveredCount: promotion.metrics.deliveredCount,
        readCount: promotion.metrics.readCount,
        clickCount: promotion.metrics.clickCount,
        failedCount: promotion.metrics.failedCount,
      },
      rates: {
        deliveryRate: promotion.deliveryRate,
        engagementRate: promotion.engagementRate,
        clickThroughRate:
          promotion.metrics.deliveredCount > 0
            ? Math.round(
                (promotion.metrics.clickCount /
                  promotion.metrics.deliveredCount) *
                  100
              )
            : 0,
      },
      discountUsage: promotion.discount?.currentUsageCount || 0,
    };
  }
}

module.exports = new PromotionService();
