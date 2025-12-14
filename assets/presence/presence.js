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

  // Randomize butterfly positions/sizes ONCE (no animation loop = low CPU)
  function seedButterflies() {
    const root = document.getElementById("butterflies");
    if (!root) return;

    const els = Array.from(root.querySelectorAll(".butterfly"));
    if (!els.length) return;

    // Keep them away from extreme edges so they don't clip.
    const xMin = 6, xMax = 86;  // vw
    const yMin = 6, yMax = 84;  // vh

    // Scales: a few large, more medium, some small
    const scaleBands = [0.55, 0.7, 0.85, 1.0, 1.15];

    for (let i = 0; i < els.length; i++) {
      const el = els[i];

      const x = (xMin + Math.random() * (xMax - xMin)).toFixed(2) + "vw";
      const y = (yMin + Math.random() * (yMax - yMin)).toFixed(2) + "vh";
      const s = scaleBands[Math.floor(Math.random() * scaleBands.length)];
      const r = ((Math.random() * 24) - 12).toFixed(1) + "deg"; // gentle tilt

      el.style.setProperty("--x", x);
      el.style.setProperty("--y", y);
      el.style.setProperty("--s", s);
      el.style.setProperty("--r", r);

      // Stagger animation start so they don't sync up
      const delay = (-Math.random() * 60).toFixed(2) + "s";
      el.style.animationDelay = delay;
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
