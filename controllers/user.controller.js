const User = require("../models/user.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { boundedLimit, boundedPage, safeSort } = require("../utils/listQuery");
const { literalRegExp } = require("../utils/escapeRegex");
const { asEnum, asBoolean, asString } = require("../utils/params");

// ADMIN: Get all users with filtering and pagination
exports.getAllUsers = catchAsync(async (req, res, next) => {
    const {
        page = 1,
        limit = 20,
        role,
        isActive,
        search,
        sort = "-createdAt",
    } = req.query;

    const pageNum = boundedPage(page);
    const limitNum = boundedLimit(limit, 20);
    const skip = (pageNum - 1) * limitNum;

    // Build filter (FA-46: values coerced at the point of use - a raw
    // query value, including arrays/operator objects, never reaches
    // the filter or a field assignment)
    const filter = { deletedAt: null };

    const roleValue = asEnum(role, ["customer", "admin"]);
    if (roleValue) {
        filter.role = roleValue;
    }

    const isActiveValue = asBoolean(isActive);
    if (isActiveValue !== undefined) {
        filter.isActive = isActiveValue;
    }

    const searchValue = asString(search, 100);
    if (searchValue) {
        const searchRegex = literalRegExp(searchValue);
        filter.$or = [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
        ];
    }

    const [users, total] = await Promise.all([
        // AR-47: lean list read. No projection is added: the model's
        // select:false fields (password, tokens, OTP) already stay out
        // of the response, and lean does not change that — the body is
        // identical, only hydration cost is removed.
        User.find(filter)
            .sort(safeSort(sort, ["createdAt", "firstName", "lastName", "email", "lastLogin"]))
            .skip(skip)
            .limit(limitNum)
            .lean(),
        User.countDocuments(filter),
    ]);

    res.status(200).json({
        status: "success",
        results: users.length,
        data: {
            users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        },
    });
});

// ADMIN: Get single user
exports.getUser = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user || user.deletedAt) {
        return next(new AppError("User not found", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            user,
        },
    });
});

// ADMIN: Update user status (activate/deactivate)
exports.updateUserStatus = catchAsync(async (req, res, next) => {
    const { isActive, reason } = req.body;

    // FA-46: isActive must be a real boolean before it is assigned.
    if (typeof isActive !== "boolean") {
        return next(new AppError("Please provide isActive as a boolean", 400));
    }

    const user = await User.findById(req.params.id);

    if (!user || user.deletedAt) {
        return next(new AppError("User not found", 404));
    }

    // Prevent admin from deactivating themselves
    if (req.user.id === user.id && !isActive) {
        return next(new AppError("You cannot deactivate your own account", 400));
    }

    user.isActive = isActive;

    if (!isActive) {
        user.deactivatedAt = Date.now();
        user.deactivationReason = reason || "No reason provided";
    } else {
        user.deactivatedAt = null;
        user.deactivationReason = null;
    }

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: "success",
        message: `User ${isActive ? "activated" : "deactivated"} successfully`,
        data: {
            user,
        },
    });
});

// ADMIN: Delete user (soft delete)
exports.deleteUser = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user || user.deletedAt) {
        return next(new AppError("User not found", 404));
    }

    if (req.user.id === user.id) {
        return next(new AppError("You cannot delete your own account", 400));
    }

    user.deletedAt = Date.now();
    user.isActive = false;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        status: "success",
        message: "User deleted successfully",
        data: null,
    });
});


