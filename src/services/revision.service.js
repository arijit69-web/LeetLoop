const Revision = require("../models/Revision");

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getDayBounds = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const createRevisionScheduleForProblem = async ({ userId, problemId, solvedAt, intervals }) => {
  const revisionDocs = intervals.map((intervalDays) => ({
    userId,
    problemId,
    intervalDays,
    dueDate: addDays(solvedAt, intervalDays),
  }));

  if (!revisionDocs.length) {
    return [];
  }

  return Revision.insertMany(revisionDocs, { ordered: false });
};

const getDueRevisionsForDate = async ({ userId, date = new Date() }) => {
  const { start, end } = getDayBounds(date);

  return Revision.find({
    userId,
    status: "pending",
    dueDate: { $gte: start, $lte: end },
  }).populate("problemId", "title titleSlug solvedAt");
};

const getCompletedRevisionsForDate = async ({ userId, date = new Date() }) => {
  const { start, end } = getDayBounds(date);

  return Revision.find({
    userId,
    status: "completed",
    dueDate: { $gte: start, $lte: end },
  }).populate("problemId", "title titleSlug solvedAt");
};

const completeRevisionById = async ({ userId, revisionId }) => {
  return Revision.findOneAndUpdate(
    {
      _id: revisionId,
      userId,
      status: "pending",
    },
    {
      $set: {
        status: "completed",
        completedAt: new Date(),
      },
    },
    { new: true }
  ).populate("problemId", "title titleSlug");
};

const reopenRevisionById = async ({ userId, revisionId }) => {
  return Revision.findOneAndUpdate(
    {
      _id: revisionId,
      userId,
      status: "completed",
    },
    {
      $set: {
        status: "pending",
        completedAt: null,
      },
    },
    { new: true }
  ).populate("problemId", "title titleSlug");
};

const groupByInterval = (revisions) => {
  return revisions.reduce((acc, revision) => {
    const key = revision.intervalDays;
    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(revision);
    return acc;
  }, {});
};

module.exports = {
  createRevisionScheduleForProblem,
  getDueRevisionsForDate,
  getCompletedRevisionsForDate,
  completeRevisionById,
  reopenRevisionById,
  groupByInterval,
};
