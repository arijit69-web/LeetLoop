const byId = (id) => document.getElementById(id);

const elements = {
  authTitle: byId("authTitle"),
  authHint: byId("authHint"),
  emailInput: byId("emailInput"),
  passwordInput: byId("passwordInput"),
  leetcodeUsernameInput: byId("leetcodeUsernameInput"),
  submitBtn: byId("submitBtn"),
  toggleModeBtn: byId("toggleModeBtn"),
  backBtn: byId("backBtn"),
  status: byId("status"),
};

const STORAGE_KEY = "leetloop_auth_token";
const params = new URLSearchParams(window.location.search);
let mode = params.get("mode") === "register" ? "register" : "login";
const nextPath = params.get("next") || "/";

const setMode = (nextMode) => {
  mode = nextMode;
  const isRegister = mode === "register";

  elements.authTitle.textContent = isRegister ? "Register" : "Login";
  elements.authHint.textContent = isRegister ? "Create your account" : "Sign in to continue";
  elements.submitBtn.textContent = isRegister ? "Register" : "Login";
  elements.toggleModeBtn.textContent = isRegister ? "Switch to Login" : "Switch to Register";
  elements.leetcodeUsernameInput.style.display = isRegister ? "block" : "none";
};

const setLoading = (isLoading) => {
  elements.submitBtn.disabled = isLoading;
  elements.toggleModeBtn.disabled = isLoading;
  elements.backBtn.disabled = isLoading;
};

const submit = async () => {
  setLoading(true);
  elements.status.textContent = mode === "register" ? "Creating account..." : "Signing in...";

  const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";

  const body = {
    email: elements.emailInput.value.trim(),
    password: elements.passwordInput.value,
  };

  if (mode === "register") {
    body.leetcodeUsername = elements.leetcodeUsernameInput.value.trim();
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Authentication failed");
    }

    localStorage.setItem(STORAGE_KEY, payload.result.token);
    elements.status.textContent = "Success. Redirecting to dashboard...";
    window.location.href = nextPath;
  } catch (error) {
    elements.status.textContent = error.message;
    elements.status.classList.add("error");
  } finally {
    setLoading(false);
  }
};

const bootstrap = async () => {
  const token = localStorage.getItem(STORAGE_KEY);

  if (token) {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        window.location.href = nextPath;
        return;
      }
    } catch (error) {
      // If session check fails, continue on auth page.
    }
  }

  setMode(mode);
};

elements.submitBtn.addEventListener("click", submit);
elements.toggleModeBtn.addEventListener("click", () => {
  setMode(mode === "login" ? "register" : "login");
});
elements.backBtn.addEventListener("click", () => {
  window.location.href = "/";
});

bootstrap();
