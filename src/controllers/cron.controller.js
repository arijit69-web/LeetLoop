const User = require("../models/User");
const { runDailyWorkflow } = require("../services/dailyWorkflow.service");

const isAuthorizedCronRequest = (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  const headerSecret = String(req.headers["x-cron-secret"] || "").trim();
  const querySecret = String(req.query.secret || "").trim();

  return bearerToken === secret || headerSecret === secret || querySecret === secret;
};

const runDailyCron = async (req, res, next) => {
  try {
    if (!isAuthorizedCronRequest(req)) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    const users = await User.find({}, "_id");

    let success = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await runDailyWorkflow({ trigger: "vercel_cron", userId: user._id });
        success += 1;
      } catch (error) {
        failed += 1;
      }
    }

    return res.status(200).json({
      ok: true,
      result: {
        usersTotal: users.length,
        success,
        failed,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  runDailyCron,
};
