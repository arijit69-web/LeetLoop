const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, default: "" },
    leetcodeUsername: { type: String, required: true, trim: true, unique: true },
    leetcodeAuth: {
      sessionToken: { type: String, default: "" },
      csrfToken: { type: String, default: "" },
      cookie: { type: String, default: "" },
      connectedAt: { type: Date, default: null },
      lastValidatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
