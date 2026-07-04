const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { submitFeedback, getMyFeedback } = require("../controllers/feedback.controller");

const router = express.Router();

router.use(requireAuth);
router.post("/", submitFeedback);
router.get("/mine", getMyFeedback);

module.exports = router;
