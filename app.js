(() => {
  const THEME_KEY = "cue_theme";
  const root = document.documentElement;

  // -------------------------
  // Theme
  // -------------------------
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch {}
    if (saved === "light" || saved === "dark") return applyTheme(saved);
    applyTheme("dark"); // default
  }

  function initThemeToggle() {
    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const current = root.getAttribute("data-theme") || "dark";
        applyTheme(current === "dark" ? "light" : "dark");
      });
    });
  }

  // -------------------------
  // Page transitions
  // -------------------------
  function isInternalLink(a) {
    if (!a || !a.href) return false;
    if (a.hasAttribute("download")) return false;
    const target = (a.getAttribute("target") || "").toLowerCase();
    if (target === "_blank") return false;
    if ((a.getAttribute("href") || "").startsWith("#")) return false;
    const url = new URL(a.href, window.location.href);
    return url.origin === window.location.origin;
  }

  function initPageTransitions() {
    const page = document.querySelector(".page");
    if (!page) return;
    requestAnimationFrame(() => page.classList.add("page--in"));

    document.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a || !isInternalLink(a)) return;

      const url = new URL(a.href, window.location.href);
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      e.preventDefault();
      page.classList.remove("page--in");
      page.classList.add("page--out");
      window.setTimeout(() => (window.location.href = a.href), 160);
    });
  }

  // -------------------------
  // Typing effect (for elements with data-type='["text"]')
  // -------------------------
  function initTyping() {
    const el = document.querySelector(".type[data-type]");
    if (!el) return;

    let phrases = [];
    try { phrases = JSON.parse(el.getAttribute("data-type")); } catch { phrases = ["Welcome to Cue’s Stuff"]; }
    const text = phrases[0] || "";

    let i = 0;
    const speed = 42; // typing speed
    const startDelay = 250;

    el.textContent = "";

    setTimeout(() => {
      const tick = () => {
        i++;
        el.textContent = text.slice(0, i);
        if (i < text.length) requestAnimationFrame(() => setTimeout(tick, speed));
      };
      tick();
    }, startDelay);
  }

  // -------------------------
  // Projects search
  // -------------------------
  function initProjectsSearch() {
    const input = document.getElementById("projectSearch");
    const pinnedGrid = document.getElementById("pinnedGrid");
    const noResults = document.getElementById("noResults");

    if (!input) return;

    const normalize = (s) => (s || "").toLowerCase().trim();
    const buttons = () => Array.from(document.querySelectorAll(".card-btn"));

    function filter() {
      const q = normalize(input.value);
      let visible = 0;

      buttons().forEach((btn) => {
        const title = normalize(btn.getAttribute("data-title") || btn.textContent);
        const show = q === "" || title.includes(q);
        btn.style.display = show ? "" : "none";
        if (show) visible++;
      });

      if (noResults) noResults.hidden = !(q && visible === 0);

      if (pinnedGrid) {
        const anyPinnedVisible = Array.from(pinnedGrid.querySelectorAll(".card-btn"))
          .some((b) => b.style.display !== "none");
        pinnedGrid.style.display = anyPinnedVisible ? "" : "none";

        const label = pinnedGrid.previousElementSibling;
        if (label && label.classList.contains("section-label")) {
          label.style.display = anyPinnedVisible ? "" : "none";
        }
      }
    }

    input.addEventListener("input", filter);
    filter();
  }

  // -------------------------
  // Animated star background (canvas)
  // -------------------------
  function initStars() {
    const canvas = document.getElementById("stars");
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });

    let w = 0, h = 0, dpr = Math.max(1, window.devicePixelRatio || 1);
    const stars = [];
    const STAR_COUNT = 140;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function makeStars() {
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: rand(0, w),
          y: rand(0, h),
          r: rand(0.6, 1.7),
          a: rand(0.25, 0.95),
          s: rand(0.06, 0.22) // speed
        });
      }
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);

      // soft gradient glow (big purple-ish blob like your screenshot)
      const gx = w * 0.35;
      const gy = h * 0.85;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.min(w, h) * 0.7);
      g.addColorStop(0, "rgba(184, 70, 255, 0.45)");
      g.addColorStop(0.45, "rgba(120, 40, 210, 0.22)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // stars
      for (const s of stars) {
        s.y += s.s;
        if (s.y > h + 5) { s.y = -5; s.x = rand(0, w); }

        const twinkle = 0.22 * Math.sin((t / 700) + s.x * 0.01);
        const alpha = Math.max(0, Math.min(1, s.a + twinkle));

        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    resize();
    makeStars();
    window.addEventListener("resize", () => { resize(); makeStars(); });
    requestAnimationFrame(draw);
  }

  // -------------------------
  // Init
  // -------------------------
  initTheme();
  initThemeToggle();
  initPageTransitions();
  initTyping();
  initProjectsSearch();
  initStars();
})();
