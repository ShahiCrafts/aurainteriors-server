const mongoose = require("mongoose");

const guestSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      unique: true,
      required: true,
      index: true,
      // FA-88: the id is a bearer credential minted by the server as
      // guest_ + 32 random bytes hex (chat.controller) - pin the format
      // so a malformed or attacker-shaped id can never be stored.
      match: [/^guest_[a-f0-9]{64}$/, "Invalid guest session id format"],
      minlength: 70,
      maxlength: 70,
    },
    email: {
      type: String,
      default: null,
    },
    chats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
      // TTL index: documents expire 24 hours after creation
      expires: 86400,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Update lastActivityAt on any activity
guestSessionSchema.pre("save", function () {
  this.lastActivityAt = new Date();
});

module.exports = mongoose.model("GuestSession", guestSessionSchema);
