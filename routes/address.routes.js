const { standardReadLimiter, standardWriteLimiter } = require("../middleware/rateLimit.middleware");
const express = require("express");
const router = express.Router();
router.use(standardReadLimiter);
router.use(standardWriteLimiter);
const addressController = require("../controllers/address.controller");
const AppError = require("../utils/AppError");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);
router.param("id", (req, res, next, id) => {
  if (!/^[a-f0-9]{24}$/i.test(id)) return next(new AppError("Invalid address ID", 400));
  next();
});

router.get("/", addressController.getAllAddresses);
router.post("/", addressController.createAddress);
router.get("/:id", addressController.getAddress);
router.patch("/:id", addressController.updateAddress);
router.delete("/:id", addressController.deleteAddress);
router.patch("/:id/set-default", addressController.setDefaultAddress);

module.exports = router;
