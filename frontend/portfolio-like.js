(() => {
  "use strict";

  const API =
    "https://aniket-portfolio-api.azurewebsites.net/api/portfolio-engagement";

  const VISITOR_KEY = "aniket-portfolio-visitor-v1";
  const LIKED_KEY = "aniket-portfolio-liked-date-v1";
  const button = document.querySelector("[data-like-button]");
  const toast = document.querySelector("[data-like-toast]");

  if (!button || !toast) return;

  const pill = button.querySelector(".portfolio-like-pill");
  const toastTitle = toast.querySelector("strong");
  const toastMessage = toast.querySelector("small");
  const closeButton = toast.querySelector("[data-like-toast-close]");

  let inFlight = false;
  let toastTimer;
  let feedbackTimer;

  function utcDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function createUuid() {
    if (!window.crypto) return null;

    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    if (typeof crypto.getRandomValues !== "function") return null;

    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, byte =>
      byte.toString(16).padStart(2, "0")
    ).join("");

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20)
    ].join("-");
  }

  function validUuid(value) {
    return typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function getVisitorId() {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        const existing = storage.getItem(VISITOR_KEY);
        if (validUuid(existing)) return existing;
      } catch (_) {
        // Try the next storage option.
      }
    }

    const id = createUuid();
    if (!id) return null;

    try {
      localStorage.setItem(VISITOR_KEY, id);
      return id;
    } catch (_) {
      try {
        sessionStorage.setItem(VISITOR_KEY, id);
      } catch (_) {
        // The ID remains available for this page session.
      }
      return id;
    }
  }

  function hasLikedToday() {
    try {
      return localStorage.getItem(LIKED_KEY) === utcDate();
    } catch (_) {
      return false;
    }
  }

  function saveLikedToday() {
    try {
      localStorage.setItem(LIKED_KEY, utcDate());
    } catch (_) {
      // Backend duplicate protection remains authoritative.
    }
  }

  function showThankYou() {
    clearTimeout(feedbackTimer);

    button.classList.add("is-liked");
    button.setAttribute("aria-pressed", "true");

    if (pill) pill.textContent = "";
    button.classList.add("is-thanking");

    showToast(
      "Thank You! ❤️",
      "Your appreciation means a lot."
    );

    feedbackTimer = setTimeout(() => {
      button.classList.remove("is-liked");
    button.classList.remove("is-thanking");
      button.setAttribute("aria-pressed", "false");

      if (pill) pill.textContent = "Like this portfolio";
    }, 1500);
  }

  function showToast(title, message) {
    clearTimeout(toastTimer);

    toastTitle.textContent = title;
    toastMessage.textContent = message;
    toast.hidden = false;

    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 1500);
  }

  async function submitLike(visitorId) {
    const payload = {
      event_type: "like",
      visitor_id: visitorId
    };

    if (["localhost", "127.0.0.1", "::1"].includes(location.hostname)) {
      window.__portfolioLikeEvents =
        window.__portfolioLikeEvents || [];

      window.__portfolioLikeEvents.push({
        ...payload,
        captured_at: new Date().toISOString()
      });

      console.info("[Local appreciation mock]", payload);
      return { duplicate: false, local: true };
    }

    const response = await fetch(API, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    let result = {};
    try {
      result = await response.json();
    } catch (_) {
      // Handle non-JSON responses below.
    }

    if (!response.ok) {
      throw new Error(result.error || `API returned HTTP ${response.status}`);
    }

    return result;
  }

  button.addEventListener("click", async () => {
    if (inFlight) return;

    if (hasLikedToday()) {
      showThankYou();
      return;
    }

    const visitorId = getVisitorId();

    if (!visitorId) {
      showToast(
        "Unable to record your like",
        "Your browser could not create a secure visitor ID."
      );
      return;
    }

    inFlight = true;
    button.disabled = true;

    try {
      await submitLike(visitorId);

      saveLikedToday();
      showThankYou();

    } catch (error) {
      console.warn("Portfolio appreciation could not be recorded:", error);

      showToast(
        "Unable to record your like",
        "Please try again in a moment."
      );

    } finally {
      inFlight = false;
      button.disabled = false;
    }
  });

  closeButton?.addEventListener("click", () => {
    clearTimeout(toastTimer);
    toast.hidden = true;
  });

  // Always show the default button on page load.
  // The backend and daily browser key prevent duplicate counting.
})();
