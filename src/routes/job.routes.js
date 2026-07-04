const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
	runDailyJob,
	getDashboard,
	getCalendar,
	connectLeetCode,
	getLeetCodeConnectionStatus,
	getJobHistory,
	completeRevision,
	reopenRevision,
} = require("../controllers/job.controller");

const router = express.Router();

router.use(requireAuth);

router.post("/jobs/daily", runDailyJob);
router.get("/jobs/history", getJobHistory);
router.get("/dashboard", getDashboard);
router.get("/calendar", getCalendar);
router.get("/leetcode/status", getLeetCodeConnectionStatus);
router.post("/leetcode/connect", connectLeetCode);
router.patch("/revisions/:revisionId/complete", completeRevision);
router.patch("/revisions/:revisionId/reopen", reopenRevision);

module.exports = router;
