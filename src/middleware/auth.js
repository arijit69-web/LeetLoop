const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";

const issueToken = ({ userId }) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
};

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [, token] = authHeader.split(" ");

    if (!token) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
};

module.exports = {
  issueToken,
  requireAuth,
};
