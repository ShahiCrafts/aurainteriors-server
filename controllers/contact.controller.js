const { sendContactResponseEmail } = require("../services/email.service");
const { boundedLimit, boundedPage, literalRegex, escapeRegex } = require("../utils/listQuery");
const Contact = require("../models/contact.model");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const notificationEventEmitter = require("../services/notificationEventEmitter");

// PUBLIC: Submit a contact form
exports.submitContact = catchAsync(async (req, res, next) => {
  const { name, email, phone, subject, message, category } = req.body;

  const contact = await Contact.create({
    name,
    email,
    phone,
    subject,
    message,
    category: category || "general",
  });

  // Emit admin notification for new contact
  try {
    notificationEventEmitter.emit("admin:contact:new", {
      contactId: contact._id,
      name: contact.name,
      email: contact.email,
      subject: contact.subject,
      category: contact.category,
    });
  } catch (error) {
    console.error("Failed to emit admin:contact:new event:", error.message);
  }

  res.status(201).json({
    status: "success",
    message: "Your message has been sent successfully. We'll get back to you soon!",
    data: {
      contact: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject,
      },
    },
  });
});

// ADMIN: Get all contacts with filtering and pagination
exports.getAllContacts = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    status,
    category,
    priority,
    isRead,
    search,
    sort = "-createdAt",
  } = req.query;

  const pageNum = boundedPage(page);
  const limitNum = boundedLimit(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (category) {
    filter.category = category;
  }

  if (priority) {
    filter.priority = priority;
  }

  if (isRead !== undefined) {
    filter.isRead = isRead === "true";
  }

  if (search) {
    filter.$or = [
      { name: literalRegex(search) },
      { email: literalRegex(search) },
      { subject: literalRegex(search) },
      { message: literalRegex(search) },
    ];
  }

  const [contacts, total] = await Promise.all([
    Contact.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate("assignedTo", "firstName lastName email")
      .populate("response.respondedBy", "firstName lastName"),
    Contact.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: contacts.length,
    data: {
      contacts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

// ADMIN: Get single contact
exports.getContact = catchAsync(async (req, res, next) => {
  const contact = await Contact.findById(req.params.id)
    .populate("assignedTo", "firstName lastName email")
    .populate("response.respondedBy", "firstName lastName");

  if (!contact) {
    return next(new AppError("Contact not found", 404));
  }

  // Mark as read if not already
  if (!contact.isRead) {
    contact.isRead = true;
    contact.readAt = new Date();
    await contact.save({ validateBeforeSave: false });
  }

  res.status(200).json({
    status: "success",
    data: {
      contact,
    },
  });
});

// ADMIN: Update contact (status, priority, notes, assignment)
exports.updateContact = catchAsync(async (req, res, next) => {
  const { status, priority, adminNotes, assignedTo } = req.body;

  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return next(new AppError("Contact not found", 404));
  }

  if (status) contact.status = status;
  if (priority) contact.priority = priority;
  if (adminNotes !== undefined) contact.adminNotes = adminNotes;
  if (assignedTo !== undefined) contact.assignedTo = assignedTo || null;

  await contact.save();

  const updatedContact = await Contact.findById(contact._id)
    .populate("assignedTo", "firstName lastName email")
    .populate("response.respondedBy", "firstName lastName");

  res.status(200).json({
    status: "success",
    data: {
      contact: updatedContact,
    },
  });
});

// ADMIN: Respond to contact
exports.respondToContact = catchAsync(async (req, res, next) => {
  const { message } = req.body;

  if (!message) {
    return next(new AppError("Response message is required", 400));
  }

  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return next(new AppError("Contact not found", 404));
  }

  contact.response = {
    message,
    respondedAt: new Date(),
    respondedBy: req.user._id,
    deliveryStatus: "pending",
  };

  await contact.save({ validateBeforeSave: false });

  try {
    const delivery = await sendContactResponseEmail(contact.email, contact.name, message);
    contact.response.deliveryStatus = "accepted";
    contact.response.acceptedAt = new Date();
    contact.response.providerMessageId = delivery?.messageId;
    contact.status = "resolved";
    await contact.save({ validateBeforeSave: false });
  } catch (_error) {
    contact.response.deliveryStatus = "failed";
    if (contact.status === "resolved") contact.status = "in-progress";
    await contact.save({ validateBeforeSave: false });
    return next(new AppError("Response saved, but email delivery failed. Please retry.", 502));
  }

  const updatedContact = await Contact.findById(contact._id)
    .populate("assignedTo", "firstName lastName email")
    .populate("response.respondedBy", "firstName lastName");

  res.status(200).json({
    status: "success",
    message: "Response submitted to the email provider",
    data: {
      contact: updatedContact,
    },
  });
});

// ADMIN: Delete contact
exports.deleteContact = catchAsync(async (req, res, next) => {
  const contact = await Contact.findByIdAndDelete(req.params.id);

  if (!contact) {
    return next(new AppError("Contact not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Contact deleted successfully",
    data: null,
  });
});

// ADMIN: Bulk update contacts
exports.bulkUpdateContacts = catchAsync(async (req, res, next) => {
  const { ids, status, isRead } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(new AppError("Please provide contact IDs", 400));
  }

  if (ids.length > 100 || ids.some(id => typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id))) {
    return next(new AppError("Provide at most 100 valid contact IDs", 400));
  }
  if (status !== undefined && !["new", "in-progress", "resolved", "closed"].includes(status)) {
    return next(new AppError("Invalid contact status", 400));
  }
  if (isRead !== undefined && typeof isRead !== "boolean") {
    return next(new AppError("isRead must be a boolean", 400));
  }
  if (status === undefined && isRead === undefined) return next(new AppError("Provide an update", 400));
  const uniqueIds = [...new Set(ids.map(id => id.toLowerCase()))];
  const updateData = {};
  if (status) updateData.status = status;
  if (isRead !== undefined) {
    updateData.isRead = isRead;
    if (isRead) updateData.readAt = new Date();
  }

  const result = await Contact.updateMany(
    { _id: { $in: uniqueIds } },
    { $set: updateData, ...(isRead === false ? { $unset: { readAt: 1 } } : {}) },
    { runValidators: true }
  );

  res.status(200).json({
    status: "success",
    message: `${result.matchedCount} contacts updated successfully`,
  });
});

// ADMIN: Get contact stats
exports.getContactStats = catchAsync(async (req, res, next) => {
  const stats = await Contact.getStats();

  res.status(200).json({
    status: "success",
    data: {
      stats,
    },
  });
});

// ADMIN: Mark as read/unread
exports.markAsRead = catchAsync(async (req, res, next) => {
  const { isRead } = req.body;

  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return next(new AppError("Contact not found", 404));
  }

  contact.isRead = isRead !== false;
  if (contact.isRead) {
    contact.readAt = new Date();
  } else {
    contact.readAt = undefined;
  }

  await contact.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    data: {
      contact,
    },
  });
});
