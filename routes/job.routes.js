const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { standardReadLimiter } = require("../middleware/rateLimit.middleware");
const Job = require("../models/job.model");

// VULN-005: this router previously had no tier limiter, unlike every
// other router. It is GET-only (status polling), so the read tier applies.
router.use(standardReadLimiter);

// Phase 3 (AR-04): job-status endpoint. When BROADCAST_MODE=queue,
// admin broadcast requests return 202 with a job id; this endpoint
// is how the admin client polls the fan-out to completion. It is
// additive (no pre-existing route shape changes) and admin-only:
// job payloads can carry campaign content not meant for customers.
router.get("/:id", protect, restrictTo("admin"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    const job = await Job.findById(req.params.id).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    return res.status(200).json({
      success: true,
      data: {
        job: {
          id: String(job._id),
          type: job.type,
          status: job.status,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          lastError: job.lastError,
          progress:
            job.payload && typeof job.payload === "object"
              ? (job.payload.progress ?? null)
              : null,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          completedAt: job.completedAt,
        },
      },
    });
  } catch (_error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to load job status" });
  }
});

module.exports = router;
