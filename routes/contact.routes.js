const { standardReadLimiter, standardWriteLimiter } = require("../middleware/rateLimit.middleware");
const express = require("express");
const router = express.Router();
router.use(standardReadLimiter);
router.use(standardWriteLimiter);
const contactController = require("../controllers/contact.controller");
const validate = require("../middleware/validate.middleware");
const AppError = require("../utils/AppError");
const { updateContactSchema, readContactSchema, respondContactSchema, submitContactSchema, bulkUpdateContactSchema } = require("../validators/contact.validator");
const { publicEndpointRateLimit } = require("../middleware/rateLimit.middleware");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// Public route - submit contact form (schema-validated + rate-limited, C-12)
router.post("/", publicEndpointRateLimit(10, "Too many messages. Please try again later."), validate(submitContactSchema), contactController.submitContact);

// Admin routes
router.use(protect, restrictTo("admin"));
router.param("id", (req, res, next, id) => {
  if (!/^[a-f0-9]{24}$/i.test(id)) return next(new AppError("Invalid contact ID", 400));
  next();
});

router.get("/", contactController.getAllContacts);
router.get("/stats", contactController.getContactStats);
router.patch("/bulk/update", validate(bulkUpdateContactSchema), contactController.bulkUpdateContacts); // FA-26: registered before /:id
router.get("/:id", contactController.getContact);
router.patch("/:id", validate(updateContactSchema), contactController.updateContact);
router.patch("/:id/read", validate(readContactSchema), contactController.markAsRead);
router.post("/:id/respond", validate(respondContactSchema), contactController.respondToContact);
router.delete("/:id", contactController.deleteContact);

module.exports = router;
