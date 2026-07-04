const byId = (id) => document.getElementById(id);

const elements = {
  calendarMeta: byId("calendarMeta"),
  calendarPrevBtn: byId("calendarPrevBtn"),
  calendarNextBtn: byId("calendarNextBtn"),
  calendarTitle: byId("calendarTitle"),
  calendarGrid: byId("calendarGrid"),
  calendarDayTitle: byId("calendarDayTitle"),
  calendarDueList: byId("calendarDueList"),
  calendarDoneList: byId("calendarDoneList"),
};

const now = new Date();
const state = {
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  selectedDay: now.getDate(),
};

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

const renderList = (items, emptyText) => {
  if (!Array.isArray(items) || items.length === 0) {
    return `<li>${emptyText}</li>`;
  }

  return items
    .map((item) => `<li>${item.intervalDays}-Day: <a href="https://leetcode.com/problems/${item.titleSlug}/" target="_blank" rel="noreferrer">${item.title}</a></li>`)
    .join("");
};

const render = (calendar) => {
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

    cells.push(`<button class="calendar-day ${selectedClass}" type="button" data-calendar-day="${day}"><div class="calendar-day-num">${day}</div><div class="calendar-day-stats">${chips}</div></button>`);
  }

  elements.calendarGrid.innerHTML = cells.join("");
  elements.calendarDueList.innerHTML = renderList(calendar.selectedDetails.pending, "No due revisions");
  elements.calendarDoneList.innerHTML = renderList(calendar.selectedDetails.completed, "No completed revisions");
};

const fetchCalendar = async (apiFetch, params = {}) => {
  const year = params.year || state.year;
  const month = params.month || state.month;
  const day = params.day || state.selectedDay;

  const response = await apiFetch(`/api/calendar?year=${year}&month=${month}&day=${day}`);
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Could not load calendar");
  }

  state.year = payload.result.year;
  state.month = payload.result.month;
  state.selectedDay = payload.result.selectedDay;
  render(payload.result);
};

const bootstrap = async () => {
  const shell = await window.LeetLoop.initShell({ requireAuth: true });
  if (!shell) {
    return;
  }

  elements.calendarPrevBtn.addEventListener("click", async () => {
    let month = state.month - 1;
    let year = state.year;
    if (month === 0) {
      month = 12;
      year -= 1;
    }

    await fetchCalendar(shell.apiFetch, { year, month, day: 1 });
  });

  elements.calendarNextBtn.addEventListener("click", async () => {
    let month = state.month + 1;
    let year = state.year;
    if (month === 13) {
      month = 1;
      year += 1;
    }

    await fetchCalendar(shell.apiFetch, { year, month, day: 1 });
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

    await fetchCalendar(shell.apiFetch, { year: state.year, month: state.month, day });
  });

  await fetchCalendar(shell.apiFetch);
};

bootstrap();
