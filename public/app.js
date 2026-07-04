const byId = (id) => document.getElementById(id);

const elements = {
  authStatus: byId("authStatus"),
  authUserLabel: byId("authUserLabel"),
  stepAccountState: byId("stepAccountState"),
  stepLeetCodeState: byId("stepLeetCodeState"),
  stepRunState: byId("stepRunState"),
  authLockNotice: byId("authLockNotice"),
  gotoRegisterBtn: byId("gotoRegisterBtn"),
  gotoLoginBtn: byId("gotoLoginBtn"),
  logoutBtn: byId("logoutBtn"),
  subline: byId("subline"),
  statusText: byId("statusText"),
  totalProblems: byId("totalProblems"),
  pendingRevisions: byId("pendingRevisions"),
  completedRevisions: byId("completedRevisions"),
  dueToday: byId("dueToday"),
  syncGapNote: byId("syncGapNote"),
  intervalList: byId("intervalList"),
  completedTodayCount: byId("completedTodayCount"),
  completedTodayList: byId("completedTodayList"),
  refreshBtn: byId("refreshBtn"),
  runJobBtn: byId("runJobBtn"),
  jobResult: byId("jobResult"),
  historyList: byId("historyList"),
  calendarMeta: byId("calendarMeta"),
  calendarPrevBtn: byId("calendarPrevBtn"),
  calendarNextBtn: byId("calendarNextBtn"),
  calendarTitle: byId("calendarTitle"),
  calendarGrid: byId("calendarGrid"),
  calendarDayTitle: byId("calendarDayTitle"),
  calendarDueList: byId("calendarDueList"),
  calendarDoneList: byId("calendarDoneList"),
  leetcodeConnectStatus: byId("leetcodeConnectStatus"),
  checkLeetCodeBtn: byId("checkLeetCodeBtn"),
};

const protectedSections = Array.from(document.querySelectorAll(".requires-auth"));

const now = new Date();
const calendarState = {
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  selectedDay: now.getDate(),
};

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

const STORAGE_KEY = "leetloop_auth_token";
let authToken = localStorage.getItem(STORAGE_KEY) || "";
let hasRunJob = false;

const setStepBadge = (element, done, doneText, pendingText) => {
  element.textContent = done ? doneText : pendingText;
  element.classList.toggle("done", done);
  element.classList.toggle("pending", !done);
};

const setAuthToken = (token) => {
  authToken = token || "";
  if (authToken) {
    localStorage.setItem(STORAGE_KEY, authToken);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const setAuthState = ({ user, message }) => {
  const isLoggedIn = Boolean(user && authToken);

  for (const section of protectedSections) {
    section.classList.toggle("hidden-block", !isLoggedIn);
  }

  elements.authLockNotice.classList.toggle("hidden-block", isLoggedIn);

  elements.refreshBtn.disabled = !isLoggedIn;
  elements.runJobBtn.disabled = !isLoggedIn;
  elements.checkLeetCodeBtn.disabled = !isLoggedIn;
  elements.logoutBtn.disabled = !isLoggedIn;
  elements.gotoLoginBtn.disabled = isLoggedIn;
  elements.gotoRegisterBtn.disabled = isLoggedIn;

  setStepBadge(elements.stepAccountState, isLoggedIn, "Done", "Pending");
  setStepBadge(elements.stepRunState, isLoggedIn && hasRunJob, "Done", "Pending");
  if (!isLoggedIn) {
    setStepBadge(elements.stepLeetCodeState, false, "Done", "Pending");
    hasRunJob = false;
    elements.subline.textContent = "Sign in to begin your spaced-repetition workflow.";
  }

  if (user?.email) {
    elements.authUserLabel.textContent = user.email;
    elements.authStatus.textContent = message || `Signed in as ${user.email}`;
  } else {
    elements.authUserLabel.textContent = "Guest";
    elements.authStatus.textContent = message || "Sign in to access your user dashboard";
  }
};

const apiFetch = async (url, options = {}) => {
  const headers = {
    ...(options.headers || {}),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setAuthToken("");
    setAuthState({ user: null, message: "Session expired. Please login again." });
    throw new Error("Unauthorized. Please login.");
  }

  return response;
};

const fetchMe = async () => {
  if (!authToken) {
    return null;
  }

  const response = await apiFetch("/api/auth/me");
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Could not load session");
  }

  return payload.result;
};

const setLoading = (isLoading) => {
  const lockedByAuth = !authToken;
  elements.refreshBtn.disabled = isLoading || lockedByAuth;
  elements.runJobBtn.disabled = isLoading || lockedByAuth;
  elements.checkLeetCodeBtn.disabled = isLoading || lockedByAuth;
  elements.gotoLoginBtn.disabled = isLoading || Boolean(authToken);
  elements.gotoRegisterBtn.disabled = isLoading || Boolean(authToken);
  elements.logoutBtn.disabled = isLoading || !authToken;
};

const renderLeetCodeStatus = (status) => {
  if (!status) {
    elements.leetcodeConnectStatus.textContent = "Not connected";
    setStepBadge(elements.stepLeetCodeState, false, "Done", "Pending");
    return;
  }

  if (!status.connected) {
    elements.leetcodeConnectStatus.textContent = "Not connected";
    setStepBadge(elements.stepLeetCodeState, false, "Done", "Pending");
    return;
  }

  const since = status.connectedAt ? new Date(status.connectedAt).toLocaleString() : "unknown time";
  elements.leetcodeConnectStatus.textContent = `Connected as ${status.leetcodeUsername} (${since})`;
  setStepBadge(elements.stepLeetCodeState, true, "Done", "Pending");
};

const fetchLeetCodeStatus = async () => {
  const response = await apiFetch("/api/leetcode/status");
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Could not fetch LeetCode status");
  }

  renderLeetCodeStatus(payload.result);
};

const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const renderIntervals = (dueByInterval) => {
  if (!Array.isArray(dueByInterval) || dueByInterval.length === 0) {
    elements.intervalList.innerHTML = '<p class="state-msg">No revisions due today. Keep solving and stay sharp.</p>';
    return;
  }

  const cards = dueByInterval
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

  elements.intervalList.innerHTML = cards;
};

const renderCompletedToday = (completedTodayByInterval, completedTodayCount) => {
  elements.completedTodayCount.textContent = `${completedTodayCount || 0} completed today`;

  if (!Array.isArray(completedTodayByInterval) || completedTodayByInterval.length === 0) {
    elements.completedTodayList.innerHTML = '<p class="state-msg">Nothing completed today yet.</p>';
    return;
  }

  const cards = completedTodayByInterval
    .map((group) => {
      const items = group.problems
        .map(
          (problem) =>
            `<li><a href="https://leetcode.com/problems/${problem.titleSlug}/" target="_blank" rel="noreferrer">${problem.title}</a><button class="reopen-btn" type="button" data-reopen-revision-id="${problem.revisionId}">Make Due Again</button></li>`
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

  elements.completedTodayList.innerHTML = cards;
};

const renderHistory = (jobHistory) => {
  if (!Array.isArray(jobHistory) || !jobHistory.length) {
    elements.historyList.innerHTML = '<p class="state-msg">No job runs logged yet.</p>';
    return;
  }

  const content = jobHistory
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

  elements.historyList.innerHTML = content;
};

const renderCalendarDetailList = (items, emptyText) => {
  if (!Array.isArray(items) || items.length === 0) {
    return `<li>${emptyText}</li>`;
  }

  return items
    .map(
      (item) =>
        `<li>${item.intervalDays}-Day: <a href="https://leetcode.com/problems/${item.titleSlug}/" target="_blank" rel="noreferrer">${escapeHtml(item.title || "Untitled")}</a></li>`
    )
    .join("");
};

const renderCalendar = (calendar) => {
  const firstDayOffset = new Date(calendar.year, calendar.month - 1, 1).getDay();
  const daysInMonth = new Date(calendar.year, calendar.month, 0).getDate();
  const dayMap = new Map((calendar.days || []).map((item) => [item.day, item]));

  elements.calendarTitle.textContent = monthLabel.format(new Date(calendar.year, calendar.month - 1, 1));
  elements.calendarMeta.textContent = `Pending ${calendar.monthTotals.pending} | Completed ${calendar.monthTotals.completed}`;
  elements.calendarDayTitle.textContent = `${calendar.selectedDay} ${monthLabel.format(new Date(calendar.year, calendar.month - 1, 1))}`;

  const cells = [];
  for (let i = 0; i < firstDayOffset; i += 1) {
    cells.push('<div class="calendar-day empty"></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const stats = dayMap.get(day) || { pending: 0, completed: 0 };
    const selectedClass = day === calendar.selectedDay ? "selected" : "";

    const chips = [
      stats.pending > 0 ? `<span class="calendar-chip due">D ${stats.pending}</span>` : "",
      stats.completed > 0 ? `<span class="calendar-chip done">C ${stats.completed}</span>` : "",
    ]
      .filter(Boolean)
      .join("");

    cells.push(`
      <button class="calendar-day ${selectedClass}" type="button" data-calendar-day="${day}">
        <div class="calendar-day-num">${day}</div>
        <div class="calendar-day-stats">${chips}</div>
      </button>
    `);
  }

  elements.calendarGrid.innerHTML = cells.join("");
  elements.calendarDueList.innerHTML = renderCalendarDetailList(calendar.selectedDetails.pending, "No due revisions");
  elements.calendarDoneList.innerHTML = renderCalendarDetailList(calendar.selectedDetails.completed, "No completed revisions");
};

const fetchCalendar = async ({ year = calendarState.year, month = calendarState.month, day = calendarState.selectedDay } = {}) => {
  const response = await apiFetch(`/api/calendar?year=${year}&month=${month}&day=${day}`);
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Could not load calendar");
  }

  calendarState.year = payload.result.year;
  calendarState.month = payload.result.month;
  calendarState.selectedDay = payload.result.selectedDay;
  renderCalendar(payload.result);
};

const renderDashboard = (data) => {
  elements.subline.textContent = `Tracking ${data.user.leetcodeUsername}`;
  if (data.totals.exactCountAvailable && typeof data.totals.leetCodeSolvedTotal === "number") {
    elements.totalProblems.textContent = String(data.totals.leetCodeSolvedTotal);
  } else {
    elements.totalProblems.textContent = "-";
  }
  elements.pendingRevisions.textContent = String(data.totals.totalPendingRevisions);
  elements.completedRevisions.textContent = String(data.totals.totalCompletedRevisions);
  elements.dueToday.textContent = String(data.totals.dueToday);

  if (!data.totals.isLeetCodeConnected) {
    elements.syncGapNote.textContent = "Exact total is hidden. Connect LeetCode first.";
    elements.syncGapNote.classList.add("error");
  } else if (typeof data.totals.leetCodeSolvedTotal === "number") {
    const gap = data.totals.syncGap || 0;
    if (gap > 0) {
      elements.syncGapNote.textContent = `Exact total from LeetCode: ${data.totals.leetCodeSolvedTotal}. Local sync is behind by ${gap}. Run sync after reconnect.`;
      elements.syncGapNote.classList.add("error");
    } else {
      elements.syncGapNote.textContent = `Exact total from LeetCode: ${data.totals.leetCodeSolvedTotal}.`;
      elements.syncGapNote.classList.remove("error");
    }
  } else {
    elements.syncGapNote.textContent = "Exact total is temporarily unavailable. Please reconnect LeetCode.";
    elements.syncGapNote.classList.add("error");
  }

  const now = new Date();
  elements.statusText.textContent = `Updated ${now.toLocaleTimeString()}`;
  renderIntervals(data.dueByInterval);
  renderCompletedToday(data.completedTodayByInterval, data.totals.completedToday);
  renderHistory(data.jobHistory);
};

const completeRevision = async (revisionId) => {
  if (!revisionId) {
    return;
  }

  setLoading(true);
  elements.statusText.textContent = "Marking revision as completed...";

  try {
    const response = await apiFetch(`/api/revisions/${revisionId}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });

    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Could not complete revision");
    }

    elements.statusText.textContent = "Revision marked as completed";
    await fetchDashboard();
  } catch (error) {
    elements.statusText.textContent = "Failed to complete revision";
    elements.jobResult.textContent = error.message;
  } finally {
    setLoading(false);
  }
};

const reopenRevision = async (revisionId) => {
  if (!revisionId) {
    return;
  }

  setLoading(true);
  elements.statusText.textContent = "Making revision due again...";

  try {
    const response = await apiFetch(`/api/revisions/${revisionId}/reopen`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });

    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Could not make revision due again");
    }

    elements.statusText.textContent = "Revision moved back to due";
    await fetchDashboard();
  } catch (error) {
    elements.statusText.textContent = "Failed to reopen revision";
    elements.jobResult.textContent = error.message;
  } finally {
    setLoading(false);
  }
};

const fetchDashboard = async () => {
  setLoading(true);
  elements.statusText.textContent = "Loading dashboard data...";

  try {
    const response = await apiFetch("/api/dashboard");
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Could not load dashboard");
    }

    renderDashboard(payload.result);
    await fetchCalendar();
    await fetchLeetCodeStatus();
  } catch (error) {
    elements.statusText.textContent = "Failed to load dashboard";
    elements.intervalList.innerHTML = `<p class="state-msg error">${error.message}</p>`;
    elements.completedTodayList.innerHTML = `<p class="state-msg error">${error.message}</p>`;
    elements.calendarGrid.innerHTML = `<p class="state-msg error">${error.message}</p>`;
    elements.syncGapNote.textContent = error.message;
    elements.syncGapNote.classList.add("error");
  } finally {
    setLoading(false);
  }
};

const runDailyJob = async () => {
  setLoading(true);
  elements.statusText.textContent = "Running daily workflow...";

  try {
    const response = await apiFetch("/api/jobs/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Daily job failed");
    }

    elements.jobResult.textContent = JSON.stringify(payload.result, null, 2);
    elements.statusText.textContent = "Daily workflow completed";
    hasRunJob = true;
    setStepBadge(elements.stepRunState, true, "Done", "Pending");
    await fetchDashboard();
  } catch (error) {
    elements.statusText.textContent = "Daily workflow failed";
    elements.jobResult.textContent = error.message;
  } finally {
    setLoading(false);
  }
};

const logout = () => {
  setAuthToken("");
  setAuthState({ user: null, message: "Logged out" });
  elements.jobResult.textContent = "No manual run yet.";
  elements.statusText.textContent = "Login required";
};

const bootstrapSession = async () => {
  if (!authToken) {
    setAuthState({ user: null });
    elements.statusText.textContent = "Login required";
    return;
  }

  try {
    const user = await fetchMe();
    setAuthState({ user });
    await fetchDashboard();
  } catch (error) {
    setAuthToken("");
    setAuthState({ user: null, message: error.message });
    elements.statusText.textContent = "Login required";
  }
};

elements.refreshBtn.addEventListener("click", fetchDashboard);
elements.runJobBtn.addEventListener("click", runDailyJob);
elements.gotoRegisterBtn.addEventListener("click", () => {
  window.location.href = "/auth.html?mode=register";
});
elements.gotoLoginBtn.addEventListener("click", () => {
  window.location.href = "/auth.html?mode=login";
});
elements.logoutBtn.addEventListener("click", logout);
elements.checkLeetCodeBtn.addEventListener("click", async () => {
  try {
    await fetchLeetCodeStatus();
    elements.statusText.textContent = "LeetCode status checked";
  } catch (error) {
    elements.statusText.textContent = "Failed to check LeetCode status";
    elements.jobResult.textContent = error.message;
  }
});
elements.intervalList.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.classList.contains("complete-btn")) {
    completeRevision(target.dataset.revisionId);
  }
});

elements.completedTodayList.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.classList.contains("reopen-btn")) {
    reopenRevision(target.dataset.reopenRevisionId);
  }
});

elements.calendarPrevBtn.addEventListener("click", async () => {
  let nextMonth = calendarState.month - 1;
  let nextYear = calendarState.year;

  if (nextMonth === 0) {
    nextMonth = 12;
    nextYear -= 1;
  }

  try {
    await fetchCalendar({ year: nextYear, month: nextMonth, day: 1 });
  } catch (error) {
    elements.statusText.textContent = "Failed to load calendar";
    elements.jobResult.textContent = error.message;
  }
});

elements.calendarNextBtn.addEventListener("click", async () => {
  let nextMonth = calendarState.month + 1;
  let nextYear = calendarState.year;

  if (nextMonth === 13) {
    nextMonth = 1;
    nextYear += 1;
  }

  try {
    await fetchCalendar({ year: nextYear, month: nextMonth, day: 1 });
  } catch (error) {
    elements.statusText.textContent = "Failed to load calendar";
    elements.jobResult.textContent = error.message;
  }
});

elements.calendarGrid.addEventListener("click", async (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const dayButton = target.closest("[data-calendar-day]");
  if (!dayButton) {
    return;
  }

  const day = Number.parseInt(dayButton.getAttribute("data-calendar-day"), 10);
  if (!Number.isInteger(day)) {
    return;
  }

  try {
    await fetchCalendar({ year: calendarState.year, month: calendarState.month, day });
  } catch (error) {
    elements.statusText.textContent = "Failed to load calendar day";
    elements.jobResult.textContent = error.message;
  }
});

bootstrapSession();
