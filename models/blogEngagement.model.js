const mongoose = require("mongoose");

// FA-25 (FRESH): one record per (blog, actor, kind). The unique compound
// index is what makes likes idempotent and views deduplicated - counters
// on the Blog document are only incremented when a record is inserted.
const blogEngagementSchema = new mongoose.Schema(
  {
    blog: { type: mongoose.Schema.Types.ObjectId, ref: "Blog", required: true },
    // "user:<ObjectId>" for authenticated users, "anon:<random id>" for
    // guests (the id rides in an HMAC-signed cookie - see utils/anonActor).
    actor: { type: String, required: true, maxlength: 80 },
    kind: { type: String, enum: ["like", "view"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

blogEngagementSchema.index({ blog: 1, actor: 1, kind: 1 }, { unique: true });

module.exports = mongoose.model("BlogEngagement", blogEngagementSchema);
