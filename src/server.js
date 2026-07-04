const app = require("./app");
const env = require("./config/env");
const { connectDb } = require("./config/db");
const { startScheduler } = require("./scheduler/cron");

const startServer = async () => {
  await connectDb();

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });

  startScheduler();
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
