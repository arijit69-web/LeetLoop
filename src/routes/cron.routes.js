const express = require("express");
const { runDailyCron } = require("../controllers/cron.controller");

const router = express.Router();

router.get("/daily", runDailyCron);
router.post("/daily", runDailyCron);

module.exports = router;
