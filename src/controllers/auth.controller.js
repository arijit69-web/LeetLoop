const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { issueToken } = require("../middleware/auth");

const register = async (req, res, next) => {
  try {
    const { email, password, leetcodeUsername } = req.body || {};

    if (!email || !password || !leetcodeUsername) {
      return res.status(400).json({ ok: false, error: "email, password and leetcodeUsername are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = String(leetcodeUsername).trim();

    const [existingEmail, existingLeetCodeUsername] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      User.findOne({ leetcodeUsername: normalizedUsername }),
    ]);

    if (existingEmail) {
      return res.status(409).json({ ok: false, error: "Email already registered" });
    }

    if (existingLeetCodeUsername) {
      return res.status(409).json({ ok: false, error: "LeetCode username is already linked to another account" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      email: normalizedEmail,
      leetcodeUsername: normalizedUsername,
      passwordHash,
    });

    const token = issueToken({ userId: user._id });

    return res.status(201).json({
      ok: true,
      result: {
        token,
        user: {
          id: user._id,
          email: user.email,
          leetcodeUsername: user.leetcodeUsername,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(String(password), user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const token = issueToken({ userId: user._id });

    return res.status(200).json({
      ok: true,
      result: {
        token,
        user: {
          id: user._id,
          email: user.email,
          leetcodeUsername: user.leetcodeUsername,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res) => {
  return res.status(200).json({
    ok: true,
    result: {
      id: req.user._id,
      email: req.user.email,
      leetcodeUsername: req.user.leetcodeUsername,
    },
  });
};

module.exports = {
  register,
  login,
  me,
};
