(() => {
  // Theme rules:
  // - Night if local hour >= 18 or < 7
  // - Else day
  // - If user OS prefers dark, we bias toward night (but time wins)
  const NIGHT_START = 18;
  const DAY_START = 7;

  function computeTheme() {
    const now = new Date();
    const h = now.getHours();
    const isNightByTime = (h >= NIGHT_START || h < DAY_START);

    // Optional bias (does not override time):
    // If time says day but OS says dark, you can flip this if you want.
    // Current behavior: time-based only (predictable).
    return isNightByTime ? "night" : "day";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  function seedButterflies() {
    const root = document.getElementById("butterflies");
    if (!root) return;

    const els = Array.from(root.querySelectorAll(".butterfly"));

    const xMin = 6, xMax = 86;
    const yMin = 6, yMax = 84;

    for (const el of els) {
        const layer = parseInt(el.dataset.layer || "4", 10);

        // subtle variation multiplier (not absolute scale)
        const s = (0.92 + Math.random() * 0.16).toFixed(2);
        const r = ((Math.random() * 24) - 12).toFixed(1) + "deg";

        el.style.setProperty("--x", (xMin + Math.random() * (xMax - xMin)).toFixed(2) + "vw");
        el.style.setProperty("--y", (yMin + Math.random() * (yMax - yMin)).toFixed(2) + "vh");
        el.style.setProperty("--s", s);
        el.style.setProperty("--r", r);

        // desync animations
        el.style.animationDelay = (-Math.random() * 60).toFixed(1) + "s";
    }
  }

  // Recompute theme occasionally (in case it crosses 6/19 while it's open)
  function scheduleThemeRefresh() {
    // Every 5 minutes is plenty; zero noticeable CPU impact.
    setInterval(() => applyTheme(computeTheme()), 5 * 60 * 1000);
  }

  // Init
  applyTheme(computeTheme());
  seedButterflies();
  scheduleThemeRefresh();
})();
