const { getUserById, getEffectiveLeetCodeAuth } = require("./user.service");
const { syncNewProblems } = require("./sync.service");
const { getDueRevisionsForDate, groupByInterval } = require("./revision.service");
const { sendDueRevisionEmail } = require("./email.service");
const { createJobRun } = require("./jobRun.service");

const runDailyWorkflow = async ({ trigger = "manual_api", userId } = {}) => {
  const startedAt = new Date();
  let user;

  try {
    if (!userId) {
      throw new Error("Missing userId for workflow");
    }

    user = await getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const { newProblems } = await syncNewProblems({
      userId: user._id,
      leetcodeUsername: user.leetcodeUsername,
      leetcodeAuth: getEffectiveLeetCodeAuth({ user }),
    });

    const dueRevisions = await getDueRevisionsForDate({ userId: user._id, date: new Date() });
    const groupedDueRevisions = groupByInterval(dueRevisions);

    let emailResult = { sent: false, reason: "No due revisions" };

    if (dueRevisions.length > 0) {
      emailResult = await sendDueRevisionEmail({
        to: user.email,
        username: user.leetcodeUsername,
        groupedDueRevisions,
      });
    }

    const result = {
      user: {
        email: user.email,
        leetcodeUsername: user.leetcodeUsername,
      },
      counts: {
        newProblems: newProblems.length,
        dueRevisions: dueRevisions.length,
      },
      email: emailResult,
    };

    const finishedAt = new Date();
    await createJobRun({
      userId: user._id,
      trigger,
      status: "success",
      counts: result.counts,
      email: result.email,
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    });

    return result;
  } catch (error) {
    const finishedAt = new Date();

    if (user && user._id) {
      await createJobRun({
        userId: user._id,
        trigger,
        status: "failed",
        counts: { newProblems: 0, dueRevisions: 0 },
        email: { sent: false, reason: "Workflow failed", code: "WORKFLOW_ERROR" },
        errorMessage: error.message || "Unknown workflow error",
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      });
    }

    throw error;
  }
};

module.exports = {
  runDailyWorkflow,
};
