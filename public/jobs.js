const byId = (id) => document.getElementById(id);

const elements = {
  status: byId("jobStatus"),
  runBtn: byId("runJobBtn"),
  refreshBtn: byId("refreshJobBtn"),
  jobResult: byId("jobResult"),
  historyList: byId("historyList"),
};

const renderHistory = (jobHistory) => {
  if (!Array.isArray(jobHistory) || !jobHistory.length) {
    elements.historyList.innerHTML = '<p class="state-msg">No job runs logged yet.</p>';
    return;
  }

  elements.historyList.innerHTML = jobHistory
    .map((run) => {
      const finishedAt = new Date(run.finishedAt).toLocaleString();
      const pillClass = run.status === "success" ? "pill-ok" : "pill-fail";
      const emailState = run.email && run.email.sent ? "email sent" : `email skipped (${run.email?.reason || "unknown"})`;

      return `
        <article class="history-item">
          <header>
            <h4>${run.trigger} - ${finishedAt}</h4>
            <span class="${pillClass}">${run.status}</span>
          </header>
          <p class="history-meta">new ${run.counts?.newProblems || 0} | due ${run.counts?.dueRevisions || 0} | ${emailState} | ${run.durationMs}ms</p>
        </article>
      `;
    })
    .join("");
};

const loadHistory = async (apiFetch) => {
  const response = await apiFetch("/api/dashboard");
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Could not load jobs");
  }

  renderHistory(payload.result.jobHistory || []);
};

const runJob = async (apiFetch) => {
  elements.status.textContent = "Running daily workflow...";

  const response = await apiFetch("/api/jobs/daily", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Daily job failed");
  }

  elements.jobResult.textContent = JSON.stringify(payload.result, null, 2);
  elements.status.textContent = "Daily workflow completed";
};

const bootstrap = async () => {
  const shell = await window.LeetLoop.initShell({ requireAuth: true });
  if (!shell) {
    return;
  }

  const refresh = async () => {
    try {
      elements.status.textContent = "Refreshing history...";
      await loadHistory(shell.apiFetch);
      elements.status.textContent = "Ready";
    } catch (error) {
      elements.status.textContent = error.message;
    }
  };

  elements.runBtn.addEventListener("click", async () => {
    try {
      await runJob(shell.apiFetch);
      await refresh();
    } catch (error) {
      elements.status.textContent = error.message;
      elements.jobResult.textContent = error.message;
    }
  });

  elements.refreshBtn.addEventListener("click", refresh);
  await refresh();
};

bootstrap();
