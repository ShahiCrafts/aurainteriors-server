const Promotion = require("../models/promotion.model");
const User = require("../models/user.model");
const NotificationService = require("./notificationService");
const AppError = require("../utils/AppError");

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
    const promotion = await Promotion.findById(promotionId)
      .populate("discount", "code discountPercentage")
      .populate("createdBy", "firstName lastName");

    if (!promotion) {
      throw new AppError("Promotion not found", 404);
    }

    if (promotion.status === "sent") {
      throw new AppError("This promotion has already been sent", 400);
    }

    if (promotion.status === "cancelled") {
      throw new AppError("Cannot send a cancelled promotion", 400);
    }

    promotion.status = "sending";
    await promotion.save();

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
        title: promotion.title,
        description: promotion.shortDescription || promotion.description,
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

      promotion.status = "sent";
      promotion.sentAt = new Date();
      promotion.metrics.sentCount = result.sentCount;
      promotion.notification = result.notificationId;
      await promotion.save();

      return {
        success: true,
        message: `Promotion sent to ${result.sentCount} users`,
        metrics: promotion.metrics,
      };
    } catch (error) {
      promotion.status = "draft";
      await promotion.save();
      throw error;
    }
  }

  async broadcastPromotionToUsers(notificationData, userIds, promotionId) {
    const batchSize = 100; // Process in batches to avoid memory issues
    let sentCount = 0;
    let notificationId = null;

    const notificationGateway = global.notificationGateway;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      for (const userId of batch) {
        try {
          const notification = await NotificationService.createNotification({
            ...notificationData,
            userId,
            idempotencyKey: `${notificationData.idempotencyKey}-${userId}`,
          });

          if (!notificationId) {
            notificationId = notification._id;
          }

          const UserNotification = require("../models/userNotification.model");
          const userNotification = await UserNotification.findOne({
            notification: notification._id,
            user: userId,
          });

          if (userNotification && notificationGateway) {
            await notificationGateway.broadcastToUser(
              userId.toString(),
              {
                title: notificationData.title,
                description: notificationData.description,
                type: notificationData.type,
                category: notificationData.category,
                priority: notificationData.priority,
                actionUrl: notificationData.actionUrl,
                data: notificationData.data,
              },
              userNotification._id.toString()
            );
          }
          // The notification is persisted regardless of realtime connectivity.
          // Offline users receive it from the notifications API when they reconnect;
          // Firebase push is optional infrastructure and must not be a startup/runtime dependency.

          sentCount++;
        } catch (error) {
          console.error(
            `Failed to send promotion to user ${userId}:`,
            error.message
          );
        }
      }
    }

    return { sentCount, notificationId };
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
    const { page = 1, limit = 20, status } = options;

    const query = {};
    if (status) {
      query.status = status;
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

  async trackEngagement(promotionId, action) {
    const promotion = await Promotion.findById(promotionId);

    if (!promotion) {
      return; // Silently fail for tracking
    }

    const fieldMap = {
      delivered: "deliveredCount",
      read: "readCount",
      clicked: "clickCount",
    };

    const field = fieldMap[action];
    if (field) {
      await promotion.updateMetrics(field, 1);
    }
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
