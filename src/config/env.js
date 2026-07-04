const dotenv = require("dotenv");

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseIntervals = (raw) => {
  if (!raw) {
    return [1, 7, 21];
  }

  const intervals = raw
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (!intervals.length) {
    return [1, 7, 21];
  }

  return [...new Set(intervals)].sort((a, b) => a - b);
};

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 3000),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/leetloop",
  leetcodeSession: process.env.LEETCODE_SESSION,
  leetcodeCsrfToken: process.env.LEETCODE_CSRFTOKEN,
  leetcodeCookie: process.env.LEETCODE_COOKIE,
  revisionIntervals: parseIntervals(process.env.REVISION_INTERVALS),
  submissionFetchLimit: toNumber(process.env.SUBMISSION_FETCH_LIMIT, 50),
  progressSyncPageSize: toNumber(process.env.PROGRESS_SYNC_PAGE_SIZE, 50),
  progressSyncMaxPages: toNumber(process.env.PROGRESS_SYNC_MAX_PAGES, 20),
  cronExpression: process.env.CRON_EXPRESSION || "0 8 * * *",
  smtp: {
    host: process.env.SMTP_HOST,
    port: toNumber(process.env.SMTP_PORT, 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  },
};
