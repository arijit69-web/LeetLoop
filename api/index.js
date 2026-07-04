const app = require("../src/app");
const { connectDb } = require("../src/config/db");

module.exports = async (req, res) => {
	await connectDb();
	return app(req, res);
};
