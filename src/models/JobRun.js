const mongoose = require("mongoose");

const jobRunSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    trigger: {
      type: String,
      enum: ["manual_api", "scheduler", "cli", "vercel_cron"],
      default: "manual_api",
      index: true,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
      index: true,
    },
    counts: {
      newProblems: { type: Number, default: 0 },
      dueRevisions: { type: Number, default: 0 },
    },
    email: {
      sent: { type: Boolean, default: false },
      reason: { type: String, default: "" },
      code: { type: String, default: "" },
    },
    errorMessage: { type: String, default: "" },
    startedAt: { type: Date, required: true, index: true },
    finishedAt: { type: Date, required: true, index: true },
    durationMs: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobRun", jobRunSchema);
