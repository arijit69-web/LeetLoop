const STORAGE_KEY = "leetloop_auth_token";

const getStoredToken = () => localStorage.getItem(STORAGE_KEY) || "";

const setStoredToken = (token) => {
  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

const getNextPath = () => `${window.location.pathname}${window.location.search}`;

const redirectToAuth = (mode = "login") => {
  const next = encodeURIComponent(getNextPath());
  window.location.href = `/auth.html?mode=${mode}&next=${next}`;
};

const apiFetch = async (url, options = {}) => {
  const headers = {
    ...(options.headers || {}),
  };

  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setStoredToken("");
    redirectToAuth("login");
    throw new Error("Unauthorized");
  }

  return response;
};

const fetchMe = async () => {
  const token = getStoredToken();
  if (!token) {
    return null;
  }

  const response = await apiFetch("/api/auth/me");
  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    return null;
  }

  return payload.result;
};

const setActiveNav = () => {
  const page = document.body.getAttribute("data-page");
  const links = document.querySelectorAll("[data-nav]");

  for (const link of links) {
    link.classList.toggle("active", link.getAttribute("data-nav") === page);
  }
};

const wireNavButtons = () => {
  const registerBtn = document.getElementById("navRegisterBtn");
  const loginBtn = document.getElementById("navLoginBtn");
  const logoutBtn = document.getElementById("navLogoutBtn");

  registerBtn?.addEventListener("click", () => redirectToAuth("register"));
  loginBtn?.addEventListener("click", () => redirectToAuth("login"));
  logoutBtn?.addEventListener("click", () => {
    setStoredToken("");
    redirectToAuth("login");
  });
};

const setNavState = ({ user }) => {
  const navUser = document.getElementById("navUser");
  const navStatus = document.getElementById("navStatus");
  const registerBtn = document.getElementById("navRegisterBtn");
  const loginBtn = document.getElementById("navLoginBtn");
  const logoutBtn = document.getElementById("navLogoutBtn");

  const loggedIn = Boolean(user);

  if (navUser) {
    navUser.textContent = loggedIn ? user.email : "Guest";
  }

  if (navStatus) {
    navStatus.textContent = loggedIn ? "Signed in" : "Login required";
  }

  if (registerBtn) {
    registerBtn.disabled = loggedIn;
  }

  if (loginBtn) {
    loginBtn.disabled = loggedIn;
  }

  if (logoutBtn) {
    logoutBtn.disabled = !loggedIn;
  }
};

const initShell = async ({ requireAuth = true } = {}) => {
  setActiveNav();
  wireNavButtons();

  const user = await fetchMe();

  if (requireAuth && !user) {
    redirectToAuth("login");
    return null;
  }

  setNavState({ user });
  return { user, apiFetch };
};

window.LeetLoop = {
  STORAGE_KEY,
  getStoredToken,
  setStoredToken,
  redirectToAuth,
  apiFetch,
  initShell,
};
