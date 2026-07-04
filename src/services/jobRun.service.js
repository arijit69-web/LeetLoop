const JobRun = require("../models/JobRun");

const createJobRun = async (payload) => {
  return JobRun.create(payload);
};

const getRecentJobRuns = async ({ userId, limit = 8 }) => {
  return JobRun.find({ userId }).sort({ finishedAt: -1 }).limit(limit);
};

module.exports = {
  createJobRun,
  getRecentJobRuns,
};
