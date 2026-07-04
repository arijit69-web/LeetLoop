const byId = (id) => document.getElementById(id);
const BACKEND_URL = "https://leet-loop.vercel.app";

const elements = {
  token: byId("token"),
  fetchTokenBtn: byId("fetchTokenBtn"),
  connectBtn: byId("connectBtn"),
  status: byId("status"),
};

const STORAGE_KEYS = {
  token: "token",
};

const setStatus = (message) => {
  elements.status.textContent = message;
};

const getCookieValue = async (name) => {
  const cookie = await chrome.cookies.get({
    url: "https://leetcode.com",
    name,
  });

  return cookie?.value || "";
};

const loadSettings = async () => {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.token]);
  elements.token.value = stored.token || "";
};

const saveSettings = async () => {
  await chrome.storage.local.set({
    [STORAGE_KEYS.token]: elements.token.value.trim(),
  });
};

const importTokenFromOpenTab = async () => {
  const appOrigin = BACKEND_URL;
  setStatus("Searching for an open LeetLoop tab...");

  const matchingTabs = await chrome.tabs.query({ url: `${appOrigin}/*` });
  const appTab = matchingTabs[0];

  if (!appTab || !appTab.id) {
    setStatus(`Open ${appOrigin} in a tab and login first, then click again.`);
    return;
  }

  try {
    const executionResults = await chrome.scripting.executeScript({
      target: { tabId: appTab.id },
      func: () => localStorage.getItem("leetloop_auth_token") || "",
    });

    const token = executionResults[0] && executionResults[0].result ? String(executionResults[0].result).trim() : "";

    if (!token) {
      setStatus("No token found in that tab. Login in LeetLoop first.");
      return;
    }

    elements.token.value = token;
    await saveSettings();
    setStatus("Token imported from open LeetLoop tab.");
  } catch (error) {
    setStatus(`Could not import token: ${error.message}`);
  }
};

const connect = async () => {
  setStatus("Reading LeetCode cookies...");

  const sessionToken = await getCookieValue("LEETCODE_SESSION");
  const csrfToken = await getCookieValue("csrftoken");

  if (!sessionToken || !csrfToken) {
    setStatus("Missing LeetCode cookies. Login at leetcode.com first.");
    return;
  }

  const backendUrl = BACKEND_URL;
  const token = elements.token.value.trim();
  if (!token) {
    setStatus("Token is required. Click 'Auto-Fill Token' first.");
    return;
  }

  setStatus("Connecting to backend...");

  try {
    const response = await fetch(`${backendUrl}/api/leetcode/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionToken,
        csrfToken,
      }),
    });

    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Connection failed");
    }

    await saveSettings();
    setStatus(`Connected as ${payload.result.leetcodeUsername}. Solved: ${payload.result.totalSolved}`);
  } catch (error) {
    setStatus(`Failed: ${error.message}`);
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  elements.fetchTokenBtn.addEventListener("click", importTokenFromOpenTab);
  elements.connectBtn.addEventListener("click", connect);
});
