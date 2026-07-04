const mongoose = require("mongoose");
const { connectDb } = require("../config/db");
const { runDailyWorkflow } = require("../services/dailyWorkflow.service");

const main = async () => {
  await connectDb();
  const userId = process.argv[2];

  if (!userId) {
    throw new Error("Missing user id. Usage: npm run job -- <userId>");
  }

  const result = await runDailyWorkflow({ trigger: "cli", userId });
  console.log(JSON.stringify(result, null, 2));
};

main()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Daily job failed", error);
    await mongoose.connection.close();
    process.exit(1);
  });
