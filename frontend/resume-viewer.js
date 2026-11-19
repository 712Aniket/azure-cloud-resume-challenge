
(() => {
  "use strict";

  const API = "https://aniket-portfolio-api.azurewebsites.net/api/portfolio-event";
  const RESUME = "resume/Aniket_Pawar_Resume.pdf";

  function track(eventType) {
    const payload = JSON.stringify({
      item_type: "resume",
      item_id: "resume",
      event_type: eventType
    });

    const blob = new Blob([payload], { type: "application/json" });

    fetch(API, {
      method: "POST",
      credentials: "omit",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(error => console.warn("Resume analytics unavailable:", error));
  }

  const modal = document.createElement("div");
  modal.className = "resume-modal";
  modal.id = "resume-modal";
  modal.classList.add(
    location.pathname.endsWith("compact.html")
      ? "resume-classic"
      : "resume-explorer"
  );
  modal.setAttribute("aria-hidden", "true");

  modal.innerHTML = `
    <section class="resume-dialog" role="dialog"
      aria-modal="true" aria-label="Resume viewer">
      <div class="resume-toolbar">
        <span class="resume-toolbar-title">Aniket Pawar · Resume</span>
        <div class="resume-toolbar-actions">
          <a class="resume-download"
             id="resume-download" href="${RESUME}" download="Aniket_Pawar_Resume.pdf">
             Download Resume
          </a>
          <button type="button" id="resume-close" aria-label="Close resume">✕</button>
        </div>
      </div>
      <iframe class="resume-frame" id="resume-frame"
        title="Resume PDF" src="about:blank"></iframe>
    </section>
  `;

  document.body.appendChild(modal);

  const frame = modal.querySelector("#resume-frame");
  const closeButton = modal.querySelector("#resume-close");
  const downloadButton = modal.querySelector("#resume-download");

  let previousFocus = null;

  function openResume() {
    previousFocus = document.activeElement;
    track("view");

    frame.src = `${RESUME}#toolbar=1&navpanes=0`;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    closeButton.focus();
  }

  function closeResume() {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    frame.src = "about:blank";
    document.body.style.overflow = "";
    previousFocus?.focus();
  }

  document.querySelectorAll('a[href*="Aniket_Pawar_Resume.pdf"]').forEach(link => {
    if (link === downloadButton) return;

    link.addEventListener("click", event => {
      event.preventDefault();

      if (link.hasAttribute("data-close")) {
        const drawer = document.querySelector("#dw");
        if (drawer?.classList.contains("open")) {
          drawer.classList.remove("open");
          drawer.setAttribute("aria-hidden", "true");
          document.body.classList.remove("menu-open");
          const panel = document.querySelector("#menu");
          if (panel) panel.inert = true;
        }
      }

      openResume();
    });
  });

  downloadButton.addEventListener("click", () => {
    track("download");
  });

  closeButton.addEventListener("click", closeResume);

  modal.addEventListener("click", event => {
    if (event.target === modal) closeResume();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal.classList.contains("active")) {
      closeResume();
    }
  });
})();
