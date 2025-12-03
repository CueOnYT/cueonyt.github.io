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
    if (saved === "light" || saved === "dark") {
      applyTheme(saved);
      return;
    }

    // Default to dark (your vibe)
    applyTheme("dark");
  }

  function initThemeToggle() {
    const btns = document.querySelectorAll(".theme-toggle");
    if (!btns.length) return;

    btns.forEach((btn) => {
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

    // ignore downloads
    if (a.hasAttribute("download")) return false;

    // ignore new tabs
    const target = (a.getAttribute("target") || "").toLowerCase();
    if (target === "_blank") return false;

    // ignore anchors on same page
    if (a.getAttribute("href")?.startsWith("#")) return false;

    const url = new URL(a.href, window.location.href);
    return url.origin === window.location.origin;
  }

  function initPageTransitions() {
    const page = document.querySelector(".page");
    if (!page) return;

    // Fade in
    requestAnimationFrame(() => page.classList.add("page--in"));

    // Fade out on nav
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      if (!isInternalLink(a)) return;

      const url = new URL(a.href, window.location.href);

      // Same page? don't animate.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      e.preventDefault();
      page.classList.remove("page--in");
      page.classList.add("page--out");

      const go = () => (window.location.href = a.href);
      window.setTimeout(go, 160);
    });
  }

  // -------------------------
  // Projects search
  // -------------------------
  function initProjectsSearch() {
    const input = document.getElementById("projectSearch");
    const allGrid = document.getElementById("projectsGrid");
    const pinnedGrid = document.getElementById("pinnedGrid");
    const noResults = document.getElementById("noResults");

    if (!input || !allGrid) return;

    const getButtons = () => Array.from(document.querySelectorAll(".project-button"));
    const normalize = (s) => (s || "").toLowerCase().trim();

    function filter() {
      const query = normalize(input.value);

      let visibleCount = 0;
      getButtons().forEach((btn) => {
        const title = normalize(btn.getAttribute("data-title") || btn.textContent);
        const show = query === "" || title.includes(query);
        btn.style.display = show ? "" : "none";
        if (show) visibleCount++;
      });

      if (noResults) noResults.hidden = visibleCount !== 0 || query === "";

      // If pinned section ends up empty, hide it
      if (pinnedGrid) {
        const anyPinnedVisible = Array.from(pinnedGrid.querySelectorAll(".project-button"))
          .some((b) => b.style.display !== "none");
        pinnedGrid.style.display = anyPinnedVisible ? "" : "none";
        const pinnedLabel = pinnedGrid.previousElementSibling;
        if (pinnedLabel && pinnedLabel.classList.contains("section-label")) {
          pinnedLabel.style.display = anyPinnedVisible ? "" : "none";
        }
      }

      // If all projects is empty, still show label but results message handles it
      if (allGrid) {
        const anyAllVisible = Array.from(allGrid.querySelectorAll(".project-button"))
          .some((b) => b.style.display !== "none");
        allGrid.style.display = anyAllVisible || query === "" ? "" : "";
      }
    }

    input.addEventListener("input", filter);
    filter();
  }

  // -------------------------
  // Init
  // -------------------------
  initTheme();
  initThemeToggle();
  initPageTransitions();
  initProjectsSearch();
})();
