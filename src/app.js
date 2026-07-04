const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const jobRoutes = require("./routes/job.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const cronRoutes = require("./routes/cron.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/favicon.ico", (req, res) => {
  res.status(204).end();
});

app.use(healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api", jobRoutes);
app.use("/api/feedback", feedbackRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.use((err, req, res, next) => {
  if (err && err.code === 11000) {
    const duplicateField = Object.keys(err.keyPattern || {})[0] || Object.keys(err.keyValue || {})[0];

    if (duplicateField === "email") {
      return res.status(409).json({ ok: false, error: "Email already registered" });
    }

    if (duplicateField === "leetcodeUsername") {
      return res
        .status(409)
        .json({ ok: false, error: "LeetCode username is already linked to another account" });
    }

    return res.status(409).json({ ok: false, error: "Duplicate value already exists" });
  }

  console.error(err);
  res.status(500).json({ ok: false, error: err.message || "Internal Server Error" });
});

module.exports = app;
