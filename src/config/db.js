const mongoose = require("mongoose");
const env = require("./env");

const connectDb = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(env.mongoUri);
  console.log("MongoDB connected");
  return mongoose.connection;
};

module.exports = {
  connectDb,
};
