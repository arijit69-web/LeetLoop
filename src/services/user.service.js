const User = require("../models/User");

const getUserById = async (userId) => {
  return User.findById(userId);
};

const updateUserLeetCodeUsername = async ({ userId, leetcodeUsername }) => {
  const normalizedUsername = leetcodeUsername.trim();

  return User.findByIdAndUpdate(
    userId,
    {
      $set: {
        leetcodeUsername: normalizedUsername,
      },
    },
    { new: true }
  );
};

const updateUserLeetCodeAuth = async ({ userId, auth }) => {
  return User.findByIdAndUpdate(
    userId,
    {
      $set: {
        "leetcodeAuth.sessionToken": auth.sessionToken || "",
        "leetcodeAuth.csrfToken": auth.csrfToken || "",
        "leetcodeAuth.cookie": auth.cookie || "",
        "leetcodeAuth.connectedAt": new Date(),
        "leetcodeAuth.lastValidatedAt": new Date(),
      },
    },
    { new: true }
  );
};

const getEffectiveLeetCodeAuth = ({ user }) => {
  if (user && user.leetcodeAuth) {
    const hasUserCookie = Boolean(user.leetcodeAuth.cookie);
    const hasUserPair = Boolean(user.leetcodeAuth.sessionToken && user.leetcodeAuth.csrfToken);

    if (hasUserCookie || hasUserPair) {
      return {
        sessionToken: user.leetcodeAuth.sessionToken,
        csrfToken: user.leetcodeAuth.csrfToken,
        cookie: user.leetcodeAuth.cookie,
      };
    }
  }

  return {
    sessionToken: "",
    csrfToken: "",
    cookie: "",
  };
};

module.exports = {
  getUserById,
  updateUserLeetCodeUsername,
  updateUserLeetCodeAuth,
  getEffectiveLeetCodeAuth,
};
