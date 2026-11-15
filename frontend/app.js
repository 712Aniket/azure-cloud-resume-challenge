(() => {
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);

  /* ---------- nav ---------- */
  const nav = $("#nav"), burger = $("#burger"), dw = $("#dw"), panel = $("#menu");
  const onScroll = () => nav.classList.toggle("solid", scrollY > 20);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  // Left drawer (Light Elves pattern): slides in from the menu button, parts come in one after another.
  const openMenu = (o) => {
    dw.classList.toggle("open", o); dw.setAttribute("aria-hidden", !o); panel.inert = !o;
    burger.setAttribute("aria-expanded", o); document.body.classList.toggle("menu-open", o);
    if (o) { const cur = $$("main section[id]").filter((sec) => sec.getBoundingClientRect().top < innerHeight * 0.4).pop()?.id;
      $$(".dw-list a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + cur));
      setTimeout(() => $(".dw-x").focus(), 60); }
    else burger.focus({ preventScroll: true });
  };
  burger.addEventListener("click", () => openMenu(true));
  $$("[data-close]", dw).forEach((el) => el.addEventListener("click", () => openMenu(false)));
  addEventListener("keydown", (e) => {
    if (!dw.classList.contains("open")) return;
    if (e.key === "Escape") openMenu(false);
    if (e.key === "Tab") { const f = $$("a, button", panel), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
  addEventListener("resize", () => innerWidth > 900 && dw.classList.contains("open") && openMenu(false));

  /* ---------- visitor location + local clock ---------- */

const clock = $("#clock");
const visitorLocation = $("#visitor-location");

const updateClock = () => {
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12"
  }).format(new Date());

  if (clock) clock.textContent = time;
  $$(".dw-clock").forEach((el) => (el.textContent = time));
};

const updateLocation = async () => {
  const locations = [visitorLocation, ...$$(".dw-location")];

  try {
    const response = await fetch("https://ipwho.is/", {
      cache: "no-store"
    });

    if (!response.ok) throw new Error("Location lookup failed");

    const data = await response.json();

    if (!data.success) throw new Error("Location unavailable");

    const city = data.city;
    const country = data.country;

    const locationText = [city, country]
      .filter(Boolean)
      .join(", ");

    locations.forEach((el) => {
      if (el) el.textContent = locationText || "Location unavailable";
    });
  } catch (error) {
    locations.forEach((el) => {
      if (el) el.textContent = "Location unavailable";
    });

    console.warn("Visitor location unavailable:", error);
  }
};

updateClock();
setInterval(updateClock, 15000);
updateLocation();

  /* ---------- typed command ---------- */
  const typed = $("#typed"), CMDS = ["whoami", "kubectl get engineer aniket-pawar", "terraform plan -out=career.tfplan", "az login --tenant devops"];
  if (RM) typed.textContent = CMDS[0];
  else (async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    await wait(500);
    for (let k = 0; ; k = (k + 1) % CMDS.length) {
      const c = CMDS[k];
      for (let i = 1; i <= c.length; i++) { typed.textContent = c.slice(0, i); await wait(45 + Math.random() * 45); }
      await wait(k === 0 ? 2600 : 2000);
      for (let i = c.length; i >= 0; i--) { typed.textContent = c.slice(0, i); await wait(18); }
      await wait(300);
    }
  })();

  /* ---------- globe ---------- */
  const cv = $("#globe"), g = cv.getContext("2d");
  const L = window.LAND || [];
  const PUNE = [18.52, 73.86];
  const CITIES = [[38.9, -77.4], [45.6, -121.2], [52.4, 4.9], [50.1, 8.7], [1.35, 103.8], [35.7, 139.7], [-33.9, 151.2], [-23.5, -46.6], [25.2, 55.3]];
  const NAMES = ["virginia", "oregon", "amsterdam", "frankfurt", "singapore", "tokyo", "sydney", "são paulo", "dubai"];
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const STARS = Array.from({ length: 140 }, () => [rnd(), rnd(), rnd() * 1.2 + 0.3, rnd()]);
  const SATS = [{ r: 1.32, tilt: 0.42, sp: 0.22, ph: 0 }, { r: 1.5, tilt: -0.28, sp: -0.14, ph: 2.1 }];
  const R2D = Math.PI / 180;
  const vec = (lat, lon) => [Math.cos(lat * R2D) * Math.cos(lon * R2D), Math.cos(lat * R2D) * Math.sin(lon * R2D), Math.sin(lat * R2D)];
  const arcs = CITIES.map(([la, lo], i) => {
    const a = vec(...PUNE), b = vec(la, lo), d = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)), N = 64, pts = [];
    for (let k = 0; k <= N; k++) { const u = k / N, s1 = Math.sin((1 - u) * d) / Math.sin(d), s2 = Math.sin(u * d) / Math.sin(d), p = [a[0] * s1 + b[0] * s2, a[1] * s1 + b[1] * s2, a[2] * s1 + b[2] * s2];
      pts.push([Math.asin(p[2]) / R2D, Math.atan2(p[1], p[0]) / R2D, 1 + Math.sin(Math.PI * u) * (0.04 + d * 0.035)]); }
    return { pts, to: [la, lo], name: NAMES[i], speed: 0.16 + (i % 4) * 0.035, off: i * 0.37 };
  });
  let W = 0, H = 0, DPR = 1, vis = true, drag = 0, dragV = 0, down = null;
  const size = () => { DPR = Math.min(innerWidth < 700 ? 1.5 : 2, devicePixelRatio || 1); const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * DPR; cv.height = H * DPR; };
  size(); addEventListener("resize", size);
  new IntersectionObserver(([e]) => (vis = e.isIntersecting)).observe(cv);
  cv.style.pointerEvents = "auto";
  cv.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = e.clientX; cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; });
  cv.style.cursor = "grab";
  cv.addEventListener("pointermove", (e) => { if (down == null) return; const dx = e.clientX - down; down = e.clientX; drag += dx * 0.25; dragV = dx * 0.25; });
  cv.addEventListener("pointerup", () => { down = null; cv.style.cursor = "grab"; }); cv.addEventListener("pointercancel", () => (down = null));
  function proj(lat, lon, lat0, lon0) {
    const p = lat * R2D, l = (lon - lon0) * R2D, p0 = lat0 * R2D;
    return [Math.cos(p) * Math.sin(l), Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l), Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l)];
  }
  function sat(sv, t, cx, cy, Rr, front) {
    const a = t * sv.sp + sv.ph, x = Math.cos(a) * sv.r, z = Math.sin(a) * sv.r, y = z * Math.sin(sv.tilt) * 0.35 + x * Math.sin(sv.tilt) * 0.25;
    if ((z > 0) !== front) return;
    const X = cx + x * Rr, Y = cy - y * Rr;
    g.fillStyle = front ? "rgba(255,207,110,.95)" : "rgba(255,207,110,.25)"; g.beginPath(); g.arc(X, Y, front ? 3 : 2, 0, 7); g.fill();
    if (front) { g.strokeStyle = "rgba(255,207,110,.35)"; g.beginPath(); g.moveTo(X - 9, Y); g.lineTo(X + 9, Y); g.stroke(); }
  }
  function orbitPath(sv, cx, cy, Rr, front) {
    g.beginPath(); let pen = false;
    for (let k = 0; k <= 90; k++) { const a = (k / 90) * Math.PI * 2, x = Math.cos(a) * sv.r, z = Math.sin(a) * sv.r, y = z * Math.sin(sv.tilt) * 0.35 + x * Math.sin(sv.tilt) * 0.25;
      if ((z > 0) === front) { const X = cx + x * Rr, Y = cy - y * Rr; pen ? g.lineTo(X, Y) : g.moveTo(X, Y); pen = true; } else pen = false; }
    g.strokeStyle = front ? "rgba(150,175,210,.16)" : "rgba(150,175,210,.07)"; g.lineWidth = 1; g.setLineDash([2, 5]); g.stroke(); g.setLineDash([]);
  }
  function draw(ms) {
    const t = ms / 1000;
    if (!down) { drag += dragV; dragV *= 0.94; }
    const lon0 = 64 + (RM ? 0 : 34 * Math.sin(t * 0.07)) - drag, lat0 = 14;
    const cx = W / 2, cy = H / 2, Rr = Math.min(W, H) * 0.4;
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
    // stars
    for (const [sx, sy, sr, sp] of STARS) { const tw = RM ? 0.6 : 0.45 + 0.55 * Math.sin(t * (0.6 + sp) + sp * 20); g.fillStyle = `rgba(220,230,255,${(0.18 * tw).toFixed(3)})`; g.fillRect(sx * W, sy * H, sr, sr); }
    // sphere
    const sg = g.createRadialGradient(cx - Rr * 0.3, cy - Rr * 0.35, Rr * 0.1, cx, cy, Rr);
    sg.addColorStop(0, "rgba(30,52,88,.55)"); sg.addColorStop(1, "rgba(12,22,40,.25)");
    g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, Rr, 0, 7); g.fill();
    g.strokeStyle = "rgba(150,175,210,.18)"; g.lineWidth = 1; g.stroke();
    const hg = g.createRadialGradient(cx, cy, Rr * 0.95, cx, cy, Rr * 1.18); hg.addColorStop(0, "rgba(255,178,36,.10)"); hg.addColorStop(1, "rgba(255,178,36,0)");
    g.fillStyle = hg; g.beginPath(); g.arc(cx, cy, Rr * 1.18, 0, 7); g.fill();
    for (const sv of SATS) { orbitPath(sv, cx, cy, Rr, false); sat(sv, t, cx, cy, Rr, false); }
    // land dots
    for (let i = 0; i < L.length; i += 2) {
      const [x, y, z] = proj(L[i + 1], L[i], lat0, lon0); if (z <= 0.02) continue;
      g.fillStyle = `rgba(160,182,215,${(0.22 + 0.7 * z).toFixed(3)})`;
      const s = 0.8 + 1.3 * z; g.fillRect(cx + x * Rr - s / 2, cy - y * Rr - s / 2, s, s);
    }
    // arcs + packets
    for (const a of arcs) {
      g.beginPath(); let pen = false;
      const P = a.pts.map(([la, lo, h]) => { const [x, y, z] = proj(la, lo, lat0, lon0); return [cx + x * Rr * h, cy - y * Rr * h, z + (h - 1) * 1.4]; });
      for (const [x, y, z] of P) { if (z > -0.05) { pen ? g.lineTo(x, y) : g.moveTo(x, y); pen = true; } else pen = false; }
      g.strokeStyle = "rgba(255,178,36,.28)"; g.lineWidth = 1.2; g.stroke();
      const u = RM ? 0.6 : ((t * a.speed + a.off) % 1.25) / 1.0;
      if (u <= 1) for (let k = 0; k < 7; k++) {
        const uu = u - k * 0.018; if (uu < 0) break;
        const [x, y, z] = P[Math.min(P.length - 1, Math.floor(uu * (P.length - 1)))]; if (z < -0.05) continue;
        g.fillStyle = `rgba(255,${190 + k * 6},${80 + k * 20},${(1 - k / 7) * 0.95})`; g.beginPath(); g.arc(x, y, (2.6 - k * 0.3), 0, 7); g.fill();
      }
      const [ex, ey, ez] = proj(a.to[0], a.to[1], lat0, lon0);
      if (ez > 0) { const X = cx + ex * Rr, Y = cy - ey * Rr;
        g.fillStyle = "rgba(255,207,110,.9)"; g.beginPath(); g.arc(X, Y, 2.4, 0, 7); g.fill();
        if (u > 1 && u < 1.25) { const q = (u - 1) / 0.25; g.strokeStyle = `rgba(255,207,110,${(1 - q) * 0.9})`; g.lineWidth = 1.5; g.beginPath(); g.arc(X, Y, 3 + q * 22, 0, 7); g.stroke(); }
        if (ez > 0.35 && W > 500) { g.font = "500 10.5px 'Geist Mono', monospace"; g.fillStyle = `rgba(139,155,179,${Math.min(0.75, (ez - 0.35) * 2).toFixed(2)})`; g.fillText(a.name, X + 7, Y + 3); } }
    }
    for (const sv of SATS) { orbitPath(sv, cx, cy, Rr, true); sat(sv, t, cx, cy, Rr, true); }
    // Pune
    const [px, py, pz] = proj(...PUNE, lat0, lon0);
    if (pz > 0) {
      const X = cx + px * Rr, Y = cy - py * Rr, pu = RM ? 0.5 : (t % 2.2) / 2.2;
      g.strokeStyle = `rgba(255,178,36,${(1 - pu) * 0.8})`; g.lineWidth = 1.5; g.beginPath(); g.arc(X, Y, 5 + pu * 26, 0, 7); g.stroke();
      g.fillStyle = "#ffb224"; g.shadowColor = "#ffb224"; g.shadowBlur = 16; g.beginPath(); g.arc(X, Y, 4.5, 0, 7); g.fill(); g.shadowBlur = 0;
      if (W > 500) { g.font = "500 12px 'Geist Mono', monospace"; g.fillStyle = "rgba(232,238,246,.85)"; g.fillText("pune · IST", X + 12, Y - 10); }
    }
  }
  let raf;
  const loop = (ms) => { if (vis) draw(ms); raf = requestAnimationFrame(loop); };
  if (RM) { draw(0); addEventListener("resize", () => draw(0)); } else raf = requestAnimationFrame(loop);
  document.fonts?.ready.then(() => RM && draw(0));

  /* ---------- reveals + counters ---------- */
  $$(".metrics .mt, .about-r p, .e, .proj, .labs a, .layers li, .cert, .contact-r").forEach((e) => e.classList.add("rv"));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; e.target.classList.add("in"); io.unobserve(e.target); }), { rootMargin: "0px 0px -8% 0px" });
  $$(".rv").forEach((e, i) => { e.style.transitionDelay = (i % 4) * 60 + "ms"; io.observe(e); });
  const cio = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const b = e.target, n = +b.dataset.count, suf = b.dataset.suffix || "", t0 = performance.now();
    if (RM) return;
    const step = (ms) => { const p = ease((ms - t0) / 1100); b.textContent = Math.round(n * p) + suf; if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$("[data-count]").forEach((b) => cio.observe(b));

  /* ---------- country-wise visitor statistics (Azure Function + Cosmos DB) ---------- */
  const countryList = $("#country-list"), countryStatus = $("#country-status");
  const local = new URLSearchParams(location.search).has("nocount");
  const safeText = (v) => String(v ?? "").replace(/[<>]/g, "");
  const renderCountries = (countries) => {
    if (!countryList) return;
    const source = Array.isArray(countries) ? countries : (countries && typeof countries === "object" ? Object.entries(countries).map(([code, value]) => ({ code, ...(typeof value === "object" ? value : { count: value }) })) : []);
    const rows = source.map((c) => ({
      code: safeText(c.code || c.country_code || "").toUpperCase(),
      name: safeText(c.name || c.country_name || c.code || "Unknown"),
      flag: safeText(c.flag || "🌐"),
      count: Number(c.count ?? c.visitor_count ?? 0)
    })).filter((c) => Number.isFinite(c.count) && c.count > 0).sort((a, b) => b.count - a.count);
    if (!rows.length) {
      countryList.innerHTML = '<p class="country-empty">No country visits have been recorded yet. Country totals will appear here as visitor locations are identified.</p>';
      if (countryStatus) countryStatus.textContent = "Awaiting country data";
      return;
    }
    countryList.innerHTML = rows.map((c) => `<article class="country-card"><span class="country-flag" aria-hidden="true">${c.flag}</span><span class="country-name">${c.name}<small>${c.code}</small></span><b>${c.count.toLocaleString("en-IN")}</b><span class="country-visits">visits</span></article>`).join("");
    if (countryStatus) countryStatus.textContent = `${rows.length} ${rows.length === 1 ? "country" : "countries"} represented`;
  };
  const loadCountryStats = async () => {
    if (!countryList) return;
    if (local) {
      countryList.innerHTML = '<p class="country-empty">Local preview · live country statistics load when this portfolio is deployed.</p>';
      if (countryStatus) countryStatus.textContent = "Live data on deployed site";
      return;
    }
    const endpoint = "https://aniket-portfolio-api.azurewebsites.net/api/visitor-count";
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(endpoint, { method: "GET", mode: "cors", cache: "no-store", headers: { "Accept": "application/json" } });
        if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
        const data = await response.json();
        renderCountries(data.countries);
        if (countryStatus && !Array.isArray(data.countries) && (!data.countries || typeof data.countries !== "object")) countryStatus.textContent = "Country data not supplied by API";
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
      }
    }
    countryList.innerHTML = '<p class="country-empty">Country statistics could not be reached. Please check the Azure Function response and its CORS allow-list for this website.</p>';
    if (countryStatus) countryStatus.textContent = "API connection unavailable";
    console.warn("Country visitor statistics unavailable:", lastError);
  };
  loadCountryStats();

  /* ---------- observability pipeline: built stages ---------- */
  const st = $$("#pipe .st"); const BUILT = 3;
  new IntersectionObserver(([e], o) => { if (!e.isIntersecting) return; o.disconnect();
    st.forEach((s, i) => setTimeout(() => { if (i < BUILT) s.classList.add("done"); else if (i === BUILT) s.classList.add("cur"); }, RM ? 0 : 250 + i * 260));
  }, { threshold: 0.5 }).observe($("#pipe"));

  /* ---------- isometric stack ---------- */
  const plates = $$(".plate"), items = $$("#layers li"), iso = $("#iso");
  let active = 4, hover = false;
  const setActive = (l) => { active = l; plates.forEach((p) => p.classList.toggle("on", +p.dataset.l === l)); items.forEach((li) => li.classList.toggle("on", +li.dataset.l === l)); };
  items.forEach((li) => { li.addEventListener("mouseenter", () => { hover = true; setActive(+li.dataset.l); }); li.addEventListener("mouseleave", () => (hover = false)); li.tabIndex = 0; li.addEventListener("focus", () => setActive(+li.dataset.l)); li.addEventListener("click", () => { hover = true; setActive(+li.dataset.l); clearTimeout(li._t); li._t = setTimeout(() => (hover = false), 5000); }); });
  setActive(4);
  if (!RM) setInterval(() => { if (!hover) setActive((active + 4) % 5); }, 2200);
  const spread = () => {
    const r = iso.getBoundingClientRect(), p = clamp(1 - (r.top + r.height / 2 - innerHeight / 2) / innerHeight);
    const gap = RM ? 46 : 12 + 40 * ease(p); plates.forEach((pl) => pl.style.setProperty("--z", (+pl.dataset.l) * gap)); $(".plates").style.setProperty("--top", gap * 4 + 40 + "px");
  };
  addEventListener("scroll", spread, { passive: true }); spread();

  /* ---------- certificate viewer ---------- */
  const modal = $("#modal"), mimg = $("#mimg"); let last;
  $$(".cert").forEach((b) => b.addEventListener("click", () => { last = b; mimg.src = `assets/certificates/${b.dataset.c}.png`; mimg.alt = $("b", b).textContent + " certificate"; modal.hidden = false; $("#mclose").focus(); document.body.style.overflow = "hidden"; }));
  const close = () => { modal.hidden = true; document.body.style.overflow = ""; last?.focus(); };
  $("#mclose").addEventListener("click", close); modal.addEventListener("click", (e) => e.target === modal && close());
  addEventListener("keydown", (e) => e.key === "Escape" && !modal.hidden && close());

  /* ---------- pointer spotlight, card glow, magnetic buttons ---------- */
  const spot = $(".spot"), FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (FINE && !RM) {
    addEventListener("pointermove", (e) => {
      document.body.classList.add("ptr"); spot.style.setProperty("--mx", e.clientX + "px"); spot.style.setProperty("--my", e.clientY + "px");
      const c = e.target.closest?.(".cert, .proj, .labs a"); if (c) { const r = c.getBoundingClientRect(); c.style.setProperty("--sx", e.clientX - r.left + "px"); c.style.setProperty("--sy", e.clientY - r.top + "px"); }
    }, { passive: true });
    $$(".btn").forEach((b) => {
      b.addEventListener("pointermove", (e) => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`; });
      b.addEventListener("pointerleave", () => (b.style.transform = ""));
    });
  }

  /* ---------- scroll progress ---------- */
  const prog = $("#prog");
  const onProg = () => prog.style.setProperty("--p", clamp(scrollY / (document.documentElement.scrollHeight - innerHeight)));
  addEventListener("scroll", onProg, { passive: true }); onProg();

  /* ---------- decode text (hero name only, on load) ---------- */
  const GL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>$#_*+=";
  function decode(el, dur = 900) {
    if (RM) return;
    const nodes = []; const walk = (n) => n.nodeType === 3 ? n.textContent.trim() && nodes.push([n, n.textContent]) : n.childNodes.forEach(walk); walk(el);
    const t0 = performance.now();
    const f = (now) => { const p = clamp((now - t0) / dur);
      for (const [n, txt] of nodes) n.textContent = [...txt].map((ch, i) => (ch === " " || i / txt.length < p * 1.15 - 0.15) ? ch : GL[(Math.random() * GL.length) | 0]).join("");
      if (p < 1) requestAnimationFrame(f); else nodes.forEach(([n, txt]) => (n.textContent = txt)); };
    requestAnimationFrame(f);
  }
  $$("[data-scr]").forEach((el, i) => setTimeout(() => decode(el, 1100), 150 + i * 160));

  /* Architecture request/response packets are animated in CSS on the live diagram. */

})();
