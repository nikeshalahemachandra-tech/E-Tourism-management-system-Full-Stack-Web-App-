/* ═══════════════════════════════════════════════════════════
   firebase-init.js  —  Auth state manager
   (Works for both email/password AND Google Sign-In)
═══════════════════════════════════════════════════════════ */

var currentAuthState = null;

// ── Quick UI restore from localStorage (before server reply) ──
var cached = localStorage.getItem("auth_state");
if (cached) {
  try {
    currentAuthState = JSON.parse(cached);
    applyAuthUI(currentAuthState);
  } catch (e) {}
}

// ── Verify with server to ensure session is still valid ──
checkAuthState();

function checkAuthState() {
  var _authPath = window.location.pathname.includes("/pages/")
    ? "../php/check_auth.php"
    : "php/check_auth.php";
  fetch(_authPath, { credentials: "include" })
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      currentAuthState = data;
      localStorage.setItem("auth_state", JSON.stringify(data));
      applyAuthUI(data);
      setTimeout(function () {
        applyAuthUI(data);
      }, 300);
      setTimeout(function () {
        applyAuthUI(data);
      }, 800);
    })
    .catch(function (err) {
      console.error("Auth check failed:", err);
    });
}

function applyAuthUI(data) {
  var authOut = document.getElementById("auth-out");
  var authIn = document.getElementById("auth-in");
  var nameEl = document.getElementById("nav-user-name");

  if (!authOut || !authIn) return;

  if (data && data.logged_in) {
    authOut.style.display = "none";
    authIn.style.display = "flex";
    if (nameEl) nameEl.textContent = "👋 " + data.name;
  } else {
    authOut.style.display = "flex";
    authIn.style.display = "none";
    if (nameEl) nameEl.textContent = "";
  }
}

/* ── Logout ─────────────────────────────────────────────────
   Handles both email/password sessions AND Google Sign-In.
   Google Identity Services does not maintain a persistent
   token in the browser, so we just revoke + clear session. */
window.logoutUser = function () {
  // 1. Sign out from Google Identity Services (if loaded)
  if (window.google && window.google.accounts && window.google.accounts.id) {
    try {
      google.accounts.id.disableAutoSelect();
      // If we stored the user's email, revoke the token
      var state = currentAuthState;
      if (state && state.email) {
        google.accounts.id.revoke(state.email, function () {
          console.log("Google token revoked");
        });
      }
    } catch (e) {
      /* GIS not available — normal for non-Google sessions */
    }
  }

  // 2. Destroy PHP session on server
  var _logoutPath = window.location.pathname.includes("/pages/")
    ? "../php/logout.php"
    : "php/logout.php";
  fetch(_logoutPath, { credentials: "include" })
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      if (data.success) {
        localStorage.removeItem("auth_state");
        currentAuthState = { logged_in: false };
        applyAuthUI(currentAuthState);
        alert("Logged out successfully!");
      }
    })
    .catch(function (err) {
      console.error("Logout failed:", err);
    });
};

window.applyAuthUI = applyAuthUI;
window.checkAuthState = checkAuthState;
