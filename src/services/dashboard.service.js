const Problem = require("../models/Problem");
const Revision = require("../models/Revision");
const { getUserById, getEffectiveLeetCodeAuth } = require("./user.service");
const { getDueRevisionsForDate, getCompletedRevisionsForDate, groupByInterval } = require("./revision.service");
const { getRecentJobRuns } = require("./jobRun.service");
const { fetchLeetCodeSolvedCount } = require("./leetcode.service");

const getMonthBounds = ({ year, month }) => {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

const clampDay = (year, month, day) => {
  const max = new Date(year, month, 0).getDate();
  if (!Number.isInteger(day) || day < 1) {
    return 1;
  }
  if (day > max) {
    return max;
  }
  return day;
};

const getDashboardOverview = async ({ userId }) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  const auth = getEffectiveLeetCodeAuth({ user });
  const isConnected = Boolean(auth.cookie || (auth.sessionToken && auth.csrfToken));

  const [
    totalProblems,
    totalPendingRevisions,
    totalCompletedRevisions,
    dueToday,
    completedToday,
    recentJobRuns,
    leetCodeSolvedTotal,
  ] = await Promise.all([
    Problem.countDocuments({ userId: user._id }),
    Revision.countDocuments({ userId: user._id, status: "pending" }),
    Revision.countDocuments({ userId: user._id, status: "completed" }),
    getDueRevisionsForDate({ userId: user._id, date: new Date() }),
    getCompletedRevisionsForDate({ userId: user._id, date: new Date() }),
    getRecentJobRuns({ userId: user._id, limit: 8 }),
    isConnected ? fetchLeetCodeSolvedCount({ username: user.leetcodeUsername }).catch(() => null) : null,
  ]);

  const grouped = groupByInterval(dueToday);
  const dueByInterval = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b)
    .map((interval) => ({
      intervalDays: interval,
      count: grouped[interval].length,
      problems: grouped[interval].map((item) => ({
        revisionId: item._id,
        id: item.problemId?._id,
        title: item.problemId?.title,
        titleSlug: item.problemId?.titleSlug,
      })),
    }));

  const completedGrouped = groupByInterval(completedToday);
  const completedTodayByInterval = Object.keys(completedGrouped)
    .map(Number)
    .sort((a, b) => a - b)
    .map((interval) => ({
      intervalDays: interval,
      count: completedGrouped[interval].length,
      problems: completedGrouped[interval].map((item) => ({
        revisionId: item._id,
        id: item.problemId?._id,
        title: item.problemId?.title,
        titleSlug: item.problemId?.titleSlug,
      })),
    }));

  const jobHistory = recentJobRuns.map((run) => ({
    id: run._id,
    trigger: run.trigger,
    status: run.status,
    counts: run.counts,
    email: run.email,
    errorMessage: run.errorMessage,
    finishedAt: run.finishedAt,
    durationMs: run.durationMs,
  }));

  return {
    user: {
      email: user.email,
      leetcodeUsername: user.leetcodeUsername,
    },
    totals: {
      totalProblems,
      totalPendingRevisions,
      totalCompletedRevisions,
      dueToday: dueToday.length,
      completedToday: completedToday.length,
      leetCodeSolvedTotal,
      isLeetCodeConnected: isConnected,
      exactCountAvailable: isConnected && typeof leetCodeSolvedTotal === "number",
      syncGap:
        typeof leetCodeSolvedTotal === "number"
          ? Math.max(0, leetCodeSolvedTotal - totalProblems)
          : null,
    },
    dueByInterval,
    completedTodayByInterval,
    jobHistory,
  };
};

const getCalendarOverview = async ({ userId, year, month, day }) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const now = new Date();
  const parsedYear = Number.isInteger(year) ? year : now.getFullYear();
  const parsedMonth = Number.isInteger(month) && month >= 1 && month <= 12 ? month : now.getMonth() + 1;
  const selectedDay = clampDay(parsedYear, parsedMonth, Number.isInteger(day) ? day : now.getDate());

  const { start, end } = getMonthBounds({ year: parsedYear, month: parsedMonth });

  const groupedCounts = await Revision.aggregate([
    {
      $match: {
        userId: user._id,
        dueDate: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: {
          day: { $dayOfMonth: "$dueDate" },
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const dayMap = {};
  for (const row of groupedCounts) {
    const dayKey = row._id.day;
    const status = row._id.status;

    if (!dayMap[dayKey]) {
      dayMap[dayKey] = { day: dayKey, pending: 0, completed: 0, total: 0 };
    }

    if (status === "pending") {
      dayMap[dayKey].pending = row.count;
    }

    if (status === "completed") {
      dayMap[dayKey].completed = row.count;
    }

    dayMap[dayKey].total += row.count;
  }

  const selectedStart = new Date(parsedYear, parsedMonth - 1, selectedDay, 0, 0, 0, 0);
  const selectedEnd = new Date(parsedYear, parsedMonth - 1, selectedDay, 23, 59, 59, 999);

  const selectedRevisions = await Revision.find({
    userId: user._id,
    dueDate: { $gte: selectedStart, $lte: selectedEnd },
  })
    .populate("problemId", "title titleSlug")
    .sort({ intervalDays: 1, createdAt: 1 });

  const selectedDetails = {
    pending: selectedRevisions
      .filter((item) => item.status === "pending")
      .map((item) => ({
        revisionId: item._id,
        intervalDays: item.intervalDays,
        title: item.problemId?.title,
        titleSlug: item.problemId?.titleSlug,
      })),
    completed: selectedRevisions
      .filter((item) => item.status === "completed")
      .map((item) => ({
        revisionId: item._id,
        intervalDays: item.intervalDays,
        title: item.problemId?.title,
        titleSlug: item.problemId?.titleSlug,
      })),
  };

  return {
    year: parsedYear,
    month: parsedMonth,
    selectedDay,
    days: Object.values(dayMap).sort((a, b) => a.day - b.day),
    selectedDetails,
    monthTotals: {
      pending: Object.values(dayMap).reduce((sum, item) => sum + item.pending, 0),
      completed: Object.values(dayMap).reduce((sum, item) => sum + item.completed, 0),
    },
  };
};

module.exports = {
  getDashboardOverview,
  getCalendarOverview,
};
