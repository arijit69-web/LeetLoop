const mongoose = require("mongoose");

const revisionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true, index: true },
    intervalDays: { type: Number, required: true },
    dueDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
      index: true,
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

revisionSchema.index({ userId: 1, problemId: 1, intervalDays: 1 }, { unique: true });

module.exports = mongoose.model("Revision", revisionSchema);
