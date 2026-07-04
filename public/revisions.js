const byId = (id) => document.getElementById(id);

const elements = {
  status: byId("revStatus"),
  intervalList: byId("intervalList"),
  completedTodayCount: byId("completedTodayCount"),
  completedTodayList: byId("completedTodayList"),
};

const renderIntervals = (dueByInterval) => {
  if (!Array.isArray(dueByInterval) || dueByInterval.length === 0) {
    elements.intervalList.innerHTML = '<p class="state-msg">No revisions due today.</p>';
    return;
  }

  elements.intervalList.innerHTML = dueByInterval
    .map((group) => {
      const items = group.problems
        .map(
          (problem) =>
            `<li><a href="https://leetcode.com/problems/${problem.titleSlug}/" target="_blank" rel="noreferrer">${problem.title}</a><button class="complete-btn" type="button" data-revision-id="${problem.revisionId}">Complete</button></li>`
        )
        .join("");

      return `
        <article class="interval-card">
          <div class="interval-head">
            <strong>${group.intervalDays}-Day Review</strong>
            <span>${group.count} due</span>
          </div>
          <ul>${items}</ul>
        </article>
      `;
    })
    .join("");
};

const renderCompleted = (completedTodayByInterval, completedTodayCount) => {
  elements.completedTodayCount.textContent = `${completedTodayCount || 0} completed today`;

  if (!Array.isArray(completedTodayByInterval) || completedTodayByInterval.length === 0) {
    elements.completedTodayList.innerHTML = '<p class="state-msg">Nothing completed today yet.</p>';
    return;
  }

  elements.completedTodayList.innerHTML = completedTodayByInterval
    .map((group) => {
      const items = group.problems
        .map(
          (problem) =>
            `<li><a href="https://leetcode.com/problems/${problem.titleSlug}/" target="_blank" rel="noreferrer">${problem.title}</a><button class="reopen-btn" type="button" data-reopen-revision-id="${problem.revisionId}">Reopen</button></li>`
        )
        .join("");

      return `
        <article class="interval-card">
          <div class="interval-head">
            <strong>${group.intervalDays}-Day Review</strong>
            <span>${group.count} completed</span>
          </div>
          <ul>${items}</ul>
        </article>
      `;
    })
    .join("");
};

const loadData = async (apiFetch) => {
  const response = await apiFetch("/api/dashboard");
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Could not load revisions");
  }

  renderIntervals(payload.result.dueByInterval);
  renderCompleted(payload.result.completedTodayByInterval, payload.result.totals.completedToday);
};

const bootstrap = async () => {
  const shell = await window.LeetLoop.initShell({ requireAuth: true });
  if (!shell) {
    return;
  }

  const refresh = async () => {
    try {
      elements.status.textContent = "Refreshing...";
      await loadData(shell.apiFetch);
      elements.status.textContent = "Updated";
    } catch (error) {
      elements.status.textContent = error.message;
    }
  };

  elements.intervalList.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains("complete-btn")) {
      return;
    }

    const revisionId = target.dataset.revisionId;
    if (!revisionId) {
      return;
    }

    await shell.apiFetch(`/api/revisions/${revisionId}/complete`, { method: "PATCH", headers: { "Content-Type": "application/json" } });
    await refresh();
  });

  elements.completedTodayList.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains("reopen-btn")) {
      return;
    }

    const revisionId = target.dataset.reopenRevisionId;
    if (!revisionId) {
      return;
    }

    await shell.apiFetch(`/api/revisions/${revisionId}/reopen`, { method: "PATCH", headers: { "Content-Type": "application/json" } });
    await refresh();
  });

  await refresh();
};

bootstrap();
