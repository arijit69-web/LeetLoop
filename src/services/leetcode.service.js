const axios = require("axios");

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

const RECENT_AC_SUBMISSIONS_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
    }
  }
`;

const MATCHED_USER_SUBMIT_STATS_QUERY = `
  query matchedUserSubmitStats($username: String!) {
    matchedUser(username: $username) {
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

const USER_PROGRESS_QUESTION_LIST_QUERY = `
  query userProgressQuestionList($filters: UserProgressQuestionListInput) {
    userProgressQuestionList(filters: $filters) {
      totalNum
      questions {
        title
        titleSlug
        lastSubmittedAt
        questionStatus
        lastResult
      }
    }
  }
`;

const CURRENT_TIMESTAMP_QUERY = `
  query currentTimestamp {
    currentTimestamp
  }
`;

const mapSubmission = (item) => ({
  submissionId: String(item.id),
  title: item.title,
  titleSlug: item.titleSlug,
  solvedAt: new Date(Number(item.timestamp) * 1000),
});

const hasAuthCookies = (auth) => {
  return Boolean(auth && (auth.cookie || (auth.sessionToken && auth.csrfToken)));
};

const buildAuthHeaders = ({ username, auth }) => {
  const cookie = auth.cookie ? auth.cookie : `LEETCODE_SESSION=${auth.sessionToken}; csrftoken=${auth.csrfToken}`;
  const csrfToken = auth.csrfToken || "";

  return {
    "Content-Type": "application/json",
    Referer: `https://leetcode.com/progress/?status=SOLVED`,
    Origin: "https://leetcode.com",
    Cookie: cookie,
    "x-csrftoken": csrfToken,
    "x-operation-name": "userProgressQuestionList",
  };
};

const fetchRecentAcceptedSubmissions = async ({ username, limit }) => {
  const response = await axios.post(
    LEETCODE_GRAPHQL_URL,
    {
      query: RECENT_AC_SUBMISSIONS_QUERY,
      variables: {
        username,
        limit,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        Referer: `https://leetcode.com/${username}/`,
      },
      timeout: 15000,
    }
  );

  const submissions = response?.data?.data?.recentAcSubmissionList || [];

  return submissions
    .filter((item) => item && item.id && item.titleSlug)
    .map(mapSubmission);
};

const fetchAcceptedSubmissionsFromProgress = async ({ username, auth, pageSize = 50, maxPages = 20 }) => {
  const limit = pageSize;

  const solvedMap = new Map();
  let totalNum = null;

  for (let page = 0; page < maxPages; page += 1) {
    const skip = page * limit;
    const response = await axios.post(
      `${LEETCODE_GRAPHQL_URL}/`,
      {
        query: USER_PROGRESS_QUESTION_LIST_QUERY,
        variables: {
          filters: {
            questionStatus: "SOLVED",
            skip,
            limit,
          },
        },
        operationName: "userProgressQuestionList",
      },
      {
        headers: buildAuthHeaders({ username, auth }),
        timeout: 20000,
      }
    );

    const payload = response?.data?.data?.userProgressQuestionList;
    const questions = payload?.questions || [];
    totalNum = typeof payload?.totalNum === "number" ? payload.totalNum : totalNum;

    for (const question of questions) {
      if (!question?.titleSlug) {
        continue;
      }

      const solvedAt = question.lastSubmittedAt ? new Date(question.lastSubmittedAt) : new Date();
      const existing = solvedMap.get(question.titleSlug);

      if (!existing || solvedAt < existing.solvedAt) {
        solvedMap.set(question.titleSlug, {
          submissionId: `progress-${question.titleSlug}`,
          title: question.title,
          titleSlug: question.titleSlug,
          solvedAt,
        });
      }
    }

    if (!questions.length) {
      break;
    }

    if (totalNum !== null && skip + questions.length >= totalNum) {
      break;
    }
  }

  return Array.from(solvedMap.values());
};

const validateLeetCodeAuth = async ({ username, auth }) => {
  const headers = buildAuthHeaders({ username, auth });

  await axios.post(
    `${LEETCODE_GRAPHQL_URL}/`,
    {
      query: CURRENT_TIMESTAMP_QUERY,
      variables: {},
      operationName: "currentTimestamp",
    },
    {
      headers,
      timeout: 15000,
    }
  );

  const response = await axios.post(
    `${LEETCODE_GRAPHQL_URL}/`,
    {
      query: USER_PROGRESS_QUESTION_LIST_QUERY,
      variables: {
        filters: {
          questionStatus: "SOLVED",
          skip: 0,
          limit: 1,
        },
      },
      operationName: "userProgressQuestionList",
    },
    {
      headers,
      timeout: 20000,
    }
  );

  const totalNum = response?.data?.data?.userProgressQuestionList?.totalNum;

  return {
    valid: true,
    totalSolved: typeof totalNum === "number" ? totalNum : null,
  };
};

const fetchAcceptedSubmissions = async ({ username, auth, progressPageSize, progressMaxPages }) => {
  if (!hasAuthCookies(auth)) {
    throw new Error("LeetCode is not connected. Exact sync requires authenticated connection.");
  }

  const solved = await fetchAcceptedSubmissionsFromProgress({
    username,
    auth,
    pageSize: progressPageSize,
    maxPages: progressMaxPages,
  });

  return solved;
};

const fetchLeetCodeSolvedCount = async ({ username }) => {
  const response = await axios.post(
    LEETCODE_GRAPHQL_URL,
    {
      query: MATCHED_USER_SUBMIT_STATS_QUERY,
      variables: { username },
    },
    {
      headers: {
        "Content-Type": "application/json",
        Referer: `https://leetcode.com/${username}/`,
      },
      timeout: 15000,
    }
  );

  const counts = response?.data?.data?.matchedUser?.submitStats?.acSubmissionNum || [];
  const total = counts.find((item) => item && item.difficulty === "All");

  return total ? Number(total.count) : null;
};

module.exports = {
  fetchAcceptedSubmissions,
  fetchAcceptedSubmissionsFromProgress,
  fetchRecentAcceptedSubmissions,
  fetchLeetCodeSolvedCount,
  validateLeetCodeAuth,
};
