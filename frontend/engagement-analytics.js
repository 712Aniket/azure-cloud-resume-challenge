(() => {
  "use strict";

  const API =
    "https://aniket-portfolio-api.azurewebsites.net/api/portfolio-engagement";

  const IDLE_LIMIT = 30000;
  const MAX_SECONDS = 21600;

  const sectionDefinitions = [
    ["about", "profile"],
    ["log", "experience"],
    ["experience", "experience"],
    ["stack", "skills"],
    ["skills", "skills"],
    ["work", "projects"],
    ["projects", "projects"],
    ["certs", "certifications"],
    ["certifications", "certifications"],
    ["contact", "contact"]
  ];

  const sections = sectionDefinitions
    .map(([elementId, key]) => ({
      element: document.getElementById(elementId),
      key
    }))
    .filter(item => item.element);

  const ratios = new Map();
  const viewed = new Set();
  const sectionTime = new Map();

  sections.forEach(item => ratios.set(item.element, 0));

  let currentSection = null;
  let totalActiveMs = 0;
  let lastActivity = performance.now();
  let lastTick = lastActivity;
  let pageVisible = !document.hidden;
  let sessionFinished = false;
  let lastPointerMove = 0;

  function send(payload) {
    // Local browser testing: capture events without contacting Azure.
    if (["localhost", "127.0.0.1", "::1"].includes(location.hostname)) {
      window.__engagementEvents = window.__engagementEvents || [];

      window.__engagementEvents.push({
        ...payload,
        captured_at: new Date().toISOString()
      });

      console.info("[Local analytics mock]", payload);
      return Promise.resolve();
    }

    // Production: send events to the Azure Function.
    return fetch(API, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).then(response => {
      if (!response.ok) {
        throw new Error(`Analytics HTTP ${response.status}`);
      }
    }).catch(error => {
      console.warn("Portfolio analytics unavailable:", error);
    });
  }

  function advance(now = performance.now()) {
    if (sessionFinished) return;

    const activeUntil = Math.min(
      now,
      lastActivity + IDLE_LIMIT
    );

    if (pageVisible && activeUntil > lastTick) {
      const elapsed = activeUntil - lastTick;
      totalActiveMs += elapsed;

      if (currentSection) {
        sectionTime.set(
          currentSection,
          (sectionTime.get(currentSection) || 0) + elapsed
        );
      }
    }

    lastTick = now;
  }

  function flushSection(key) {
    if (!key) return;

    const milliseconds = sectionTime.get(key) || 0;
    const seconds = Math.floor(milliseconds / 1000);

    if (seconds < 1) return;

    sectionTime.set(key, milliseconds - seconds * 1000);

    send({
      event_type: "section_time",
      section_id: key,
      active_seconds: Math.min(seconds, MAX_SECONDS)
    });
  }

  function changeSection(next) {
    if (next === currentSection) return;

    advance();
    flushSection(currentSection);

    currentSection = next;

    if (next && !viewed.has(next)) {
      viewed.add(next);

      send({
        event_type: "section_view",
        section_id: next
      });
    }
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      advance();

      entries.forEach(entry => {
        ratios.set(
          entry.target,
          entry.isIntersecting ? entry.intersectionRatio : 0
        );
      });

      const visible = sections
        .map(item => ({
          key: item.key,
          ratio: ratios.get(item.element) || 0
        }))
        .filter(item => item.ratio >= 0.05)
        .sort((a, b) => b.ratio - a.ratio);

      changeSection(visible.length ? visible[0].key : null);
    }, {
      threshold: [0, 0.05, 0.15, 0.3, 0.5, 0.75, 1],
      rootMargin: "-12% 0px -18% 0px"
    });

    sections.forEach(item => observer.observe(item.element));
  }

  function recordActivity() {
    const now = performance.now();

    advance(now);
    lastActivity = now;
    lastTick = now;
  }

  ["pointerdown", "keydown", "touchstart", "scroll", "wheel"]
    .forEach(eventName => {
      document.addEventListener(eventName, recordActivity, {
        passive: true
      });
    });

  document.addEventListener("pointermove", () => {
    const now = performance.now();

    if (now - lastPointerMove >= 1000) {
      lastPointerMove = now;
      recordActivity();
    }
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    advance();

    pageVisible = !document.hidden;

    if (!pageVisible) {
      flushSection(currentSection);
    } else {
      lastActivity = performance.now();
    }

    lastTick = performance.now();
  });

  window.addEventListener("pagehide", () => {
    if (sessionFinished) return;

    advance();
    flushSection(currentSection);

    sessionFinished = true;

    send({
      event_type: "session",
      active_seconds: Math.min(
        Math.floor(totalActiveMs / 1000),
        MAX_SECONDS
      )
    });
  });
})();
