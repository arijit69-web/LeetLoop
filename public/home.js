const byId = (id) => document.getElementById(id);

const elements = {
  subtitle: byId("homeSubtitle"),
  totalSolved: byId("homeTotalSolved"),
  dueToday: byId("homeDueToday"),
  pending: byId("homePending"),
  connected: byId("homeConnected"),
};

const loadOverview = async () => {
  const shell = await window.LeetLoop.initShell({ requireAuth: true });
  if (!shell) {
    return;
  }

  try {
    const response = await shell.apiFetch("/api/dashboard");
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Could not load overview");
    }

    const { totals, user } = payload.result;
    elements.subtitle.textContent = `Welcome back, ${user.leetcodeUsername}. Choose a page to continue.`;
    elements.totalSolved.textContent = totals.exactCountAvailable ? String(totals.leetCodeSolvedTotal) : "-";
    elements.dueToday.textContent = String(totals.dueToday || 0);
    elements.pending.textContent = String(totals.totalPendingRevisions || 0);
    elements.connected.textContent = totals.isLeetCodeConnected ? "Yes" : "No";
  } catch (error) {
    elements.subtitle.textContent = error.message;
  }
};

loadOverview();
