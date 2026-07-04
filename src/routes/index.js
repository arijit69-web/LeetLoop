const express = require("express");

const healthRoutes = require("./health.routes");
const jobRoutes = require("./job.routes");

const router = express.Router();

router.use(healthRoutes);
router.use("/api", jobRoutes);

module.exports = router;
