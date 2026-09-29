const NotificationService = require("./notificationService");

const ONE_MINUTE = 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

let promotionInterval = null;
let cleanupTimeout = null;
let cleanupInterval = null;
let isProcessingPromotions = false;
let isCleaningNotifications = false;

async function processScheduledPromotions() {
  if (isProcessingPromotions) return;
  isProcessingPromotions = true;
  try {
    const PromotionService = require("./promotionService");
    await PromotionService.processScheduledPromotions();
  } catch (error) {
    console.error("[background] Scheduled promotion processing failed:", error.message);
  } finally {
    isProcessingPromotions = false;
  }
}

async function cleanupExpiredNotifications() {
  if (isCleaningNotifications) return;
  isCleaningNotifications = true;
  try {
    await NotificationService.cleanupExpiredNotifications();
  } catch (error) {
    console.error("[background] Notification cleanup failed:", error.message);
  } finally {
    isCleaningNotifications = false;
  }
}

function millisecondsUntilNextUtcHour(hour) {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hour, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

function startBackgroundTasks() {
  if (promotionInterval || cleanupTimeout || cleanupInterval) return;

  // Preserve the former Bull cadence without requiring Redis.
  promotionInterval = setInterval(processScheduledPromotions, ONE_MINUTE);
  promotionInterval.unref?.();

  cleanupTimeout = setTimeout(() => {
    cleanupExpiredNotifications();
    cleanupInterval = setInterval(cleanupExpiredNotifications, ONE_DAY);
    cleanupInterval.unref?.();
  }, millisecondsUntilNextUtcHour(2));
  cleanupTimeout.unref?.();

  // Catch promotions that became due while the service was offline.
  setImmediate(processScheduledPromotions);
  console.log("✓ Background tasks initialized (Redis/Bull not required)");
}

function stopBackgroundTasks() {
  if (promotionInterval) clearInterval(promotionInterval);
  if (cleanupTimeout) clearTimeout(cleanupTimeout);
  if (cleanupInterval) clearInterval(cleanupInterval);
  promotionInterval = null;
  cleanupTimeout = null;
  cleanupInterval = null;
}

function runDocumentIngestion(documentId) {
  // Keep uploads responsive while retaining the existing async behavior.
  setImmediate(async () => {
    try {
      console.log(`[INGESTION] Processing document ${documentId} in-process`);
      const IngestionService = require("./ingestionService");
      await IngestionService.ingestDocument(documentId);
    } catch (error) {
      console.error(`[INGESTION] Document ${documentId} failed:`, error.message);
    }
  });
}

module.exports = {
  startBackgroundTasks,
  stopBackgroundTasks,
  runDocumentIngestion,
};
