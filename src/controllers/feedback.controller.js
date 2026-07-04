const Feedback = require("../models/Feedback");

const submitFeedback = async (req, res, next) => {
  try {
    const { kind = "bug", title, description, pageUrl = "" } = req.body || {};

    if (!title || !description) {
      return res.status(400).json({ ok: false, error: "title and description are required" });
    }

    const normalizedKind = ["bug", "feedback"].includes(kind) ? kind : "bug";

    const doc = await Feedback.create({
      userId: req.user._id,
      kind: normalizedKind,
      title: String(title).trim(),
      description: String(description).trim(),
      pageUrl: String(pageUrl || "").trim(),
      userAgent: String(req.headers["user-agent"] || "").trim(),
    });

    return res.status(201).json({
      ok: true,
      result: {
        id: doc._id,
        kind: doc.kind,
        title: doc.title,
        status: doc.status,
        createdAt: doc.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getMyFeedback = async (req, res, next) => {
  try {
    const list = await Feedback.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .select("kind title status createdAt pageUrl");

    return res.status(200).json({ ok: true, result: list });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  submitFeedback,
  getMyFeedback,
};
