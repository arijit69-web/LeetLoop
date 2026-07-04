const { runDailyWorkflow } = require("../services/dailyWorkflow.service");
const { getDashboardOverview, getCalendarOverview } = require("../services/dashboard.service");
const {
  updateUserLeetCodeUsername,
  updateUserLeetCodeAuth,
  getEffectiveLeetCodeAuth,
} = require("../services/user.service");
const { getRecentJobRuns } = require("../services/jobRun.service");
const { completeRevisionById, reopenRevisionById } = require("../services/revision.service");
const { validateLeetCodeAuth } = require("../services/leetcode.service");

const runDailyJob = async (req, res, next) => {
  try {
    const result = await runDailyWorkflow({ trigger: "manual_api", userId: req.user._id });
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    return next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const result = await getDashboardOverview({ userId: req.user._id });
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    return next(error);
  }
};

const getCalendar = async (req, res, next) => {
  try {
    const year = Number.parseInt(req.query.year, 10);
    const month = Number.parseInt(req.query.month, 10);
    const day = Number.parseInt(req.query.day, 10);

    const result = await getCalendarOverview({
      userId: req.user._id,
      year: Number.isInteger(year) ? year : undefined,
      month: Number.isInteger(month) ? month : undefined,
      day: Number.isInteger(day) ? day : undefined,
    });

    return res.status(200).json({ ok: true, result });
  } catch (error) {
    return next(error);
  }
};

const getJobHistory = async (req, res, next) => {
  try {
    const result = await getRecentJobRuns({ userId: req.user._id, limit: 20 });
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    return next(error);
  }
};

const connectLeetCode = async (req, res, next) => {
  try {
    const user = req.user;
    const {
      leetcodeUsername,
      sessionToken = "",
      csrfToken = "",
      cookie = "",
    } = req.body || {};

    const auth = {
      sessionToken: String(sessionToken || "").trim(),
      csrfToken: String(csrfToken || "").trim(),
      cookie: String(cookie || "").trim(),
    };

    const hasAuth = Boolean(auth.cookie || (auth.sessionToken && auth.csrfToken));
    if (!hasAuth) {
      return res.status(400).json({
        ok: false,
        error: "Provide LEETCODE_COOKIE or both session token and csrf token",
      });
    }

    const targetUsername = leetcodeUsername ? String(leetcodeUsername).trim() : user.leetcodeUsername;
    const validated = await validateLeetCodeAuth({ username: targetUsername, auth });

    let updatedUser = user;
    if (targetUsername !== user.leetcodeUsername) {
      updatedUser = await updateUserLeetCodeUsername({ userId: user._id, leetcodeUsername: targetUsername });
    }

    updatedUser = await updateUserLeetCodeAuth({ userId: updatedUser._id, auth });

    return res.status(200).json({
      ok: true,
      result: {
        leetcodeUsername: updatedUser.leetcodeUsername,
        connectedAt: updatedUser.leetcodeAuth?.connectedAt,
        totalSolved: validated.totalSolved,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getLeetCodeConnectionStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const auth = getEffectiveLeetCodeAuth({ user });
    const connected = Boolean(auth.cookie || (auth.sessionToken && auth.csrfToken));

    return res.status(200).json({
      ok: true,
      result: {
        connected,
        leetcodeUsername: user.leetcodeUsername,
        connectedAt: user.leetcodeAuth?.connectedAt || null,
        lastValidatedAt: user.leetcodeAuth?.lastValidatedAt || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const completeRevision = async (req, res, next) => {
  try {
    const { revisionId } = req.params;

    const revision = await completeRevisionById({ userId: req.user._id, revisionId });

    if (!revision) {
      return res.status(404).json({ ok: false, error: "Revision not found or already completed" });
    }

    return res.status(200).json({
      ok: true,
      result: {
        id: revision._id,
        status: revision.status,
        completedAt: revision.completedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const reopenRevision = async (req, res, next) => {
  try {
    const { revisionId } = req.params;

    const revision = await reopenRevisionById({ userId: req.user._id, revisionId });

    if (!revision) {
      return res.status(404).json({ ok: false, error: "Revision not found or already pending" });
    }

    return res.status(200).json({
      ok: true,
      result: {
        id: revision._id,
        status: revision.status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  runDailyJob,
  getDashboard,
  getCalendar,
  connectLeetCode,
  getLeetCodeConnectionStatus,
  getJobHistory,
  completeRevision,
  reopenRevision,
};
