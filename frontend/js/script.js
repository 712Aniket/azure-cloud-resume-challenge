// Visitor counter — preserves the existing total-count endpoint and supports country totals when returned by the API.
const visitorCountElement = document.getElementById("visitor-count");
const countryPillsElement = document.getElementById("country-visitor-pills");
const API_URL = "https://aniket-portfolio-api.azurewebsites.net/api/visitor-count";

async function updateVisitorCount() {
  if (!visitorCountElement) return;
  try {
    visitorCountElement.textContent = "Connecting...";
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    visitorCountElement.textContent = data.visitor_count ?? data.totalVisitors ?? "Unavailable";

    // Country pills are populated only from real API data; no sample counts are displayed.
    const countries = data.countries ?? data.country_visitors ?? [];
    if (countryPillsElement && Array.isArray(countries) && countries.length) {
      countryPillsElement.replaceChildren();
      countries.forEach(country => {
        const pill = document.createElement("span");
        pill.className = "country-visitor-pill";
        const flag = document.createElement("span");
        flag.className = "country-flag";
        flag.textContent = country.flag || country.emoji || "🌐";
        const name = document.createElement("span");
        name.className = "country-name";
        name.textContent = country.name || country.country || country.code || "Unknown";
        const count = document.createElement("strong");
        count.className = "country-count";
        count.textContent = Number(country.count ?? country.visitor_count ?? 0).toLocaleString();
        pill.append(flag, name, count);
        countryPillsElement.appendChild(pill);
      });
    }
  } catch (error) {
    console.error("Visitor counter error:", error);
    visitorCountElement.textContent = "Unavailable";
  }
}
updateVisitorCount();

// Theme: saved preference wins; otherwise use the operating-system preference.
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");
const root = document.documentElement;
const storedTheme = localStorage.getItem("portfolio-theme");
const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
let currentTheme = storedTheme || (systemPrefersDark ? "dark" : "light");

function applyTheme(theme, animate = false) {
  currentTheme = theme;
  root.dataset.theme = theme;
  if (themeIcon) themeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
  if (themeToggle) {
    themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    themeToggle.setAttribute("title", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    if (animate) {
      themeToggle.classList.remove("is-switching");
      void themeToggle.offsetWidth;
      themeToggle.classList.add("is-switching");
      window.setTimeout(() => themeToggle.classList.remove("is-switching"), 450);
    }
  }
}
applyTheme(currentTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("portfolio-theme", nextTheme);
    applyTheme(nextTheme, true);
  });
}

// One-time greeting balloon: appears, holds briefly, then bursts away.
function showGreetingBalloon() {
  const greeting = document.getElementById("time-greeting");
  if (!greeting) return;
  const hour = new Date().getHours();
  let message;
  if (hour >= 5 && hour < 12) message = "Good morning! ☀️";
  else if (hour >= 12 && hour < 17) message = "Good afternoon! 🌤️";
  else if (hour >= 17 && hour < 21) message = "Good evening! 🌆";
  else message = "Good night! 🌙";
  greeting.textContent = message;
  greeting.classList.add("greeting-visible");
  window.setTimeout(() => {
    greeting.classList.remove("greeting-visible");
    greeting.classList.add("greeting-burst");
    window.setTimeout(() => {
      greeting.remove();
    }, 650);
  }, 3000);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", showGreetingBalloon, { once: true });
} else {
  showGreetingBalloon();
}

// Lightweight, one-time scroll reveal. No library; elements stay visible after first reveal.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion && "IntersectionObserver" in window) {
  const revealTargets = document.querySelectorAll(
    "main section, .skill-category, .project-card, .certification-card, .contact-section"
  );
  revealTargets.forEach((element, index) => {
    element.classList.add("js-reveal");
    if (element.matches(".skill-category, .project-card, .certification-card")) {
      element.style.setProperty("--reveal-delay", `${(index % 4) * 65}ms`);
    }
  });
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
  revealTargets.forEach(element => revealObserver.observe(element));
}

// Certificate viewer and zoom controls
const certificateModal = document.getElementById("certificate-modal");
const certificateImage = document.getElementById("certificate-image");
const certificateContainer = document.querySelector(".certificate-image-container");
const certificateClose = document.getElementById("certificate-close");
let certificateZoom = 1;

function updateCertificateZoom() {
  if (!certificateImage || !certificateContainer) return;
  certificateImage.style.transform = `scale(${certificateZoom})`;
  certificateContainer.style.overflow = "auto";
}
function openCertificate(card) {
  if (!certificateModal || !certificateImage || !certificateClose) return;
  const certificatePath = card.dataset.certificate;
  card.classList.add("is-flipping");
  window.setTimeout(() => {
    card.classList.remove("is-flipping");
    certificateImage.src = certificatePath;
    certificateZoom = 1;
    updateCertificateZoom();
    certificateModal.classList.add("active");
    certificateModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    certificateClose.focus();
  }, 320);
}
function closeCertificate() {
  if (!certificateModal || !certificateImage) return;
  certificateModal.classList.remove("active");
  certificateModal.setAttribute("aria-hidden", "true");
  certificateImage.src = "";
  document.body.style.overflow = "";
}
document.querySelectorAll(".certification-card").forEach(card => {
  card.addEventListener("click", () => openCertificate(card));
});
if (certificateClose) certificateClose.addEventListener("click", closeCertificate);
if (certificateModal) certificateModal.addEventListener("click", event => {
  if (event.target === certificateModal) closeCertificate();
});
const zoomIn = document.getElementById("zoom-in");
const zoomOut = document.getElementById("zoom-out");
const zoomReset = document.getElementById("zoom-reset");
if (zoomIn) zoomIn.addEventListener("click", () => { certificateZoom = Math.min(certificateZoom + 0.2, 3); updateCertificateZoom(); });
if (zoomOut) zoomOut.addEventListener("click", () => { certificateZoom = Math.max(certificateZoom - 0.2, 0.6); updateCertificateZoom(); });
if (zoomReset) zoomReset.addEventListener("click", () => { certificateZoom = 1; updateCertificateZoom(); });
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && certificateModal?.classList.contains("active")) closeCertificate();
});
