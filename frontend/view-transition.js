/*
 * Directional page transitions for Explorer <-> Classic.
 * These are deliberately different in each direction and use ordinary CSS/JS
 * navigation timing rather than relying on the browser's cross-document VT API.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "aniket-portfolio-directional-transition";
  const CLASSIC_EXIT_MS = 400;
  const EXPLORER_EXIT_MS = 450;
  const CLASSIC_ENTRY_CLEANUP_MS = 500;
  const EXPLORER_ENTRY_CLEANUP_MS = 500;
  const root = document.documentElement;
  const scene = document.querySelector(".portfolio-transition-scene");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let navigationStarted = false;

  const setOrigin = (x, y) => {
    root.style.setProperty("--fx-x", `${Math.round(x)}px`);
    root.style.setProperty("--fx-y", `${Math.round(y)}px`);
  };

  function clearParticles() {
    scene?.querySelector(".fx-particles")?.replaceChildren();
  }

  function createParticles(direction, phase, originX, originY) {
    const holder = scene?.querySelector(".fx-particles");
    if (!holder) return;
    holder.replaceChildren();

    const count = window.innerWidth < 600 ? 30 : 48;
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement("i");
      const size = 2 + Math.random() * 4.5;
      const delay = Math.round(Math.random() * 25);
      const angle = Math.random() * Math.PI * 2;
      const distance = (phase === "exit" && direction === "to-classic")
        ? Math.hypot(window.innerWidth, window.innerHeight) * (0.42 + Math.random() * 0.48)
        : Math.min(window.innerWidth, window.innerHeight) * (0.35 + Math.random() * 0.65);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      particle.style.setProperty("--size", `${size.toFixed(1)}px`);
      particle.style.setProperty("--delay", `${delay}ms`);
      particle.style.setProperty("--dx", `${dx.toFixed(1)}px`);
      particle.style.setProperty("--dy", `${dy.toFixed(1)}px`);

      if (phase === "exit" && direction === "to-classic") {
        // Explorer's globe and scattered points are drawn inward to one core.
        const startX = Math.random() * window.innerWidth;
        const startY = Math.random() * window.innerHeight;
        particle.style.left = `${startX.toFixed(1)}px`;
        particle.style.top = `${startY.toFixed(1)}px`;
        particle.style.setProperty("--dx", `${(originX - startX).toFixed(1)}px`);
        particle.style.setProperty("--dy", `${(originY - startY).toFixed(1)}px`);
      } else {
        particle.style.left = `${originX}px`;
        particle.style.top = `${originY}px`;
      }
      fragment.appendChild(particle);
    }

    holder.appendChild(fragment);
  }

  function initialiseEntry() {
    const direction = root.dataset.transitionEntry;
    if (reducedMotion) {
      root.removeAttribute("data-transition-entry");
      root.removeAttribute("data-transition-playing");
      if (scene) scene.className = "portfolio-transition-scene";
      clearParticles();
      return;
    }

    if (!direction || !scene) {
      clearParticles();
      return;
    }

    const x = Number.parseFloat(getComputedStyle(root).getPropertyValue("--fx-x")) || window.innerWidth / 2;
    const y = Number.parseFloat(getComputedStyle(root).getPropertyValue("--fx-y")) || window.innerHeight / 2;
    scene.className = `portfolio-transition-scene fx-entry-${direction}`;
    createParticles(direction, "entry", x, y);

    window.setTimeout(() => {
      root.removeAttribute("data-transition-entry");
      root.removeAttribute("data-transition-playing");
      scene.className = "portfolio-transition-scene";
      clearParticles();
    }, direction === 'to-explorer'
      ? EXPLORER_ENTRY_CLEANUP_MS
      : CLASSIC_ENTRY_CLEANUP_MS);
  }

  initialiseEntry();

  // Restore a clean page when the browser brings it back from the back/forward cache.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    root.removeAttribute("data-transition-exit");
    root.removeAttribute("data-transition-playing");
    document.querySelectorAll(".compact-view-switch, .timeline-view-switch").forEach((link) => {
      link.removeAttribute("aria-disabled");
    });
    if (scene) scene.className = "portfolio-transition-scene";
    clearParticles();
    navigationStarted = false;
  });

  document.addEventListener("click", (event) => {
    if (reducedMotion || navigationStarted || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target.closest(".compact-view-switch, .timeline-view-switch");
    if (!link || (link.target && link.target !== "_self")) return;

    const direction = link.matches(".compact-view-switch") ? "to-classic" : "to-explorer";
    const rect = link.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    const destination = link.href;

    event.preventDefault();
    navigationStarted = true;

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        direction,
        nx: originX / Math.max(window.innerWidth, 1),
        ny: originY / Math.max(window.innerHeight, 1),
        time: Date.now()
      }));
    } catch (_) {
      // The outgoing cinematic still runs; destination navigation remains reliable.
    }

    setOrigin(originX, originY);
    root.dataset.transitionExit = direction;
    root.dataset.transitionPlaying = "exit";
    if (scene) {
      scene.className = `portfolio-transition-scene fx-exit-${direction}`;
      createParticles(direction, "exit", originX, originY);
    }
    link.setAttribute("aria-disabled", "true");

    const delay = direction === "to-classic" ? CLASSIC_EXIT_MS : EXPLORER_EXIT_MS;
    window.setTimeout(() => {
      window.location.assign(destination);
    }, delay);
  }, true);
})();
