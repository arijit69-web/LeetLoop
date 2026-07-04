const cron = require("node-cron");
const env = require("../config/env");
const User = require("../models/User");
const { runDailyWorkflow } = require("../services/dailyWorkflow.service");

const startScheduler = () => {
  cron.schedule(env.cronExpression, async () => {
    try {
      const users = await User.find({}, "_id");
      for (const user of users) {
        try {
          const result = await runDailyWorkflow({ trigger: "scheduler", userId: user._id });
          console.log("Daily workflow completed", result);
        } catch (error) {
          console.error(`Daily workflow failed for user ${user._id}`, error.message);
        }
      }
    } catch (error) {
      console.error("Daily workflow failed", error.message);
    }
  });

  console.log(`Scheduler started with cron: ${env.cronExpression}`);
};

module.exports = {
  startScheduler,
};
