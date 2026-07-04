const env = require("../config/env");
const Problem = require("../models/Problem");
const { fetchAcceptedSubmissions } = require("./leetcode.service");
const { createRevisionScheduleForProblem } = require("./revision.service");

const syncNewProblems = async ({ userId, leetcodeUsername, leetcodeAuth }) => {
  const submissions = await fetchAcceptedSubmissions({
    username: leetcodeUsername,
    auth: leetcodeAuth,
    progressPageSize: env.progressSyncPageSize,
    progressMaxPages: env.progressSyncMaxPages,
  });

  const dedupedBySlugMap = new Map();

  for (const submission of submissions) {
    const existing = dedupedBySlugMap.get(submission.titleSlug);

    if (!existing) {
      dedupedBySlugMap.set(submission.titleSlug, submission);
      continue;
    }

    if (submission.solvedAt < existing.solvedAt) {
      dedupedBySlugMap.set(submission.titleSlug, submission);
    }
  }

  const dedupedBySlug = Array.from(dedupedBySlugMap.values());

  const slugs = dedupedBySlug.map((item) => item.titleSlug);
  const existingProblems = await Problem.find({ userId, titleSlug: { $in: slugs } }).select("titleSlug");

  const existingSlugSet = new Set(existingProblems.map((item) => item.titleSlug));
  const newSubmissions = dedupedBySlug.filter((item) => !existingSlugSet.has(item.titleSlug));

  if (!newSubmissions.length) {
    return { newProblems: [] };
  }

  const createdProblems = await Problem.insertMany(
    newSubmissions.map((item) => ({
      userId,
      title: item.title,
      titleSlug: item.titleSlug,
      leetcodeSubmissionId: item.submissionId,
      solvedAt: item.solvedAt,
    })),
    { ordered: false }
  );

  for (const problem of createdProblems) {
    await createRevisionScheduleForProblem({
      userId,
      problemId: problem._id,
      solvedAt: problem.solvedAt,
      intervals: env.revisionIntervals,
    });
  }

  return {
    newProblems: createdProblems,
  };
};

module.exports = {
  syncNewProblems,
};
