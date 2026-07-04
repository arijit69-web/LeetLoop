const byId = (id) => document.getElementById(id);

const elements = {
  status: byId("connectStatus"),
  checkBtn: byId("checkStatusBtn"),
};

const fetchStatus = async (apiFetch) => {
  const response = await apiFetch("/api/leetcode/status");
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Could not fetch status");
  }

  if (!payload.result.connected) {
    elements.status.textContent = "Not connected";
    return;
  }

  const when = payload.result.connectedAt ? new Date(payload.result.connectedAt).toLocaleString() : "unknown";
  elements.status.textContent = `Connected as ${payload.result.leetcodeUsername} (${when})`;
};

const bootstrap = async () => {
  const shell = await window.LeetLoop.initShell({ requireAuth: true });
  if (!shell) {
    return;
  }

  const run = async () => {
    try {
      elements.status.textContent = "Checking...";
      await fetchStatus(shell.apiFetch);
    } catch (error) {
      elements.status.textContent = error.message;
    }
  };

  elements.checkBtn.addEventListener("click", run);
  await run();
};

bootstrap();
