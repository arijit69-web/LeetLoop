const byId = (id) => document.getElementById(id);

const elements = {
  status: byId("feedbackStatus"),
  kind: byId("feedbackKind"),
  title: byId("feedbackTitle"),
  description: byId("feedbackDescription"),
  submitBtn: byId("submitFeedbackBtn"),
  refreshBtn: byId("refreshFeedbackBtn"),
  list: byId("feedbackList"),
};

const renderList = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    elements.list.innerHTML = '<p class="state-msg">No reports submitted yet.</p>';
    return;
  }

  elements.list.innerHTML = items
    .map((item) => {
      const createdAt = new Date(item.createdAt).toLocaleString();
      const badgeClass = item.status === "closed" ? "pill-ok" : "pill-fail";
      return `
        <article class="history-item">
          <header>
            <h4>${item.kind.toUpperCase()} - ${item.title}</h4>
            <span class="${badgeClass}">${item.status}</span>
          </header>
          <p class="history-meta">${createdAt}${item.pageUrl ? ` | ${item.pageUrl}` : ""}</p>
        </article>
      `;
    })
    .join("");
};

const loadMyReports = async (apiFetch) => {
  const response = await apiFetch("/api/feedback/mine");
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Could not load reports");
  }

  renderList(payload.result || []);
};

const submit = async (apiFetch) => {
  const title = elements.title.value.trim();
  const description = elements.description.value.trim();

  if (!title || !description) {
    throw new Error("Title and description are required");
  }

  const response = await apiFetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: elements.kind.value,
      title,
      description,
      pageUrl: window.location.href,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Could not submit report");
  }

  elements.title.value = "";
  elements.description.value = "";
  elements.status.textContent = "Report submitted. Thank you.";
};

const bootstrap = async () => {
  const shell = await window.LeetLoop.initShell({ requireAuth: true });
  if (!shell) {
    return;
  }

  const refresh = async () => {
    try {
      elements.status.textContent = "Loading your reports...";
      await loadMyReports(shell.apiFetch);
      elements.status.textContent = "Share issues or suggestions";
    } catch (error) {
      elements.status.textContent = error.message;
    }
  };

  elements.submitBtn.addEventListener("click", async () => {
    try {
      elements.status.textContent = "Submitting report...";
      await submit(shell.apiFetch);
      await refresh();
    } catch (error) {
      elements.status.textContent = error.message;
    }
  });

  elements.refreshBtn.addEventListener("click", refresh);

  await refresh();
};

bootstrap();
