const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    titleSlug: { type: String, required: true, trim: true },
    leetcodeSubmissionId: { type: String, required: true, trim: true },
    solvedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

problemSchema.index({ userId: 1, titleSlug: 1 }, { unique: true });

module.exports = mongoose.model("Problem", problemSchema);
