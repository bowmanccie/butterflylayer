// /site/assets/js/loader.js
/**
 * Loads HTML partials, wires the header/nav, fixes footer year,
 * and (optionally) shows a motivational quote bubble.
 * Also, supports construction mode via construction.json.
 */

const CONSTRUCTION_CONFIG_URL = '/assets/meta/construction.json?v=20251125232252';

function normalizePath(path) {
  if (!path) return '/';
  path = path.replace(/index\.html$/i, '');
  if (path !== '/' && !path.endsWith('/')) {
    path += '/';
  }

  // *** NEW: normalize /pages/... to root-level paths
  path = path.replace(/^\/pages\//, "/");
  
  return path;
}

function createConstructionBanner(cfg) {
  const div = document.createElement('div');
  div.className = 'l8-construction-banner';

  const label = (cfg.level || 'in progress').toUpperCase();
  const message =
    cfg.message ||
    'This page is part of an active build. Some sections may be incomplete or evolving.';

  div.innerHTML = `
    <div class="l8-construction-inner">
      <span class="l8-construction-pill">${label}</span>
      <span class="l8-construction-text">${message}</span>
    </div>
  `;

  return div;
}

function insertConstructionBanner(banner) {
  const slot = document.getElementById('construction-banner-slot');
  if (slot) {
    slot.appendChild(banner);
  } else {
    document.body.prepend(banner);
  }
}

function offsetFloatingButterfly(banner) {
  const fb = document.querySelector('.floating-butterfly');
  if (!fb) return;

  const h = banner.offsetHeight;

  // Apply dynamic CSS variable (the best, smoothest method)
  document.documentElement.style.setProperty('--banner-offset', h + 'px');
}

function findConstructionConfig(data, current) {
  // exact match first
  let exact = data.pages.find(p => normalizePath(p.path) === current);
  if (exact) {
    // You can optionally treat level === "none" as an explicit "no banner"
    if (exact.level === "none") return null;
    return exact;
  }

  // no exact match -> section-level cascade
  return data.pages.find(p => {
    const cfg = normalizePath(p.path);
    if (cfg === "/") return current === "/";       // root only matches root
    if (!p.cascade) return false;                  // only cascade if explicitly allowed
    return current.startsWith(cfg);
  }) || null;
}

function applyConstructionBanner() {
  const current = normalizePath(window.location.pathname);

  fetch(CONSTRUCTION_CONFIG_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load construction.json');
      return res.json();
    })
    .then(function (data) {
      if (!data || !Array.isArray(data.pages)) return;

      const current = normalizePath(window.location.pathname);
      const match = findConstructionConfig(data, current);
      if (!match) return;

      const banner = createConstructionBanner(match);
      insertConstructionBanner(banner);
      offsetFloatingButterfly(banner);
    })
    .catch(function (err) {
      if (window.console && console.debug) {
        console.debug('[L8 construction] skipped:', err.message || err);
      }
    });
}


async function loadPartial(targetSelector, url) {
  const target = document.querySelector(targetSelector);
  if (!target) return;
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const html = await res.text();
    target.innerHTML = html;

    // After header/footer mount, run enhancers:
    if (targetSelector === "#header") enhanceHeader(target);
    if (targetSelector === "#footer") enhanceFooter(target);
  } catch (err) {
    console.error("Partial load failed:", url, err);
  }
}

function enhanceHeader(root) {
  // Mobile nav toggle
  const toggle = root.querySelector("#nav-toggle");
  const nav = root.querySelector("#primary-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      // Simple show/hide for mobile; desktop is handled by CSS
      if (!expanded) {
        nav.style.display = "block";
      } else {
        nav.style.display = "";
      }
    });
  }

  // Mark active link with exact path match
  let here = location.pathname.replace(/\/+$/, "");
  if (here === "") here = "/"; // normalize root

  root.querySelectorAll("nav a[href]").forEach(a => {
    let path = a.getAttribute("href").replace(/\/+$/, "");
    if (path === "") path = "/";

    if (path === here) {
      a.setAttribute("aria-current", "page");
    }
  });
}

function enhanceFooter(root) {
  // Auto year
  const y = root.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
}

/* ---------- Quote bubble (optional) ---------- */

function showQuoteBubble(quote) {
  if (!quote || !quote.text) return;

  const box = document.createElement("aside");
  box.className = "quote-bubble";
  box.setAttribute("role", "note");
  box.innerHTML = `
    <button class="quote-close" aria-label="Close">×</button>
    <p>${quote.text}</p>
    ${quote.author ? `<small>— ${quote.author}</small>` : ""}
  `;
  document.body.appendChild(box);

  box.querySelector(".quote-close")?.addEventListener("click", () => {
    box.remove();
  });
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  const v = "20251125232252"; // will be replaced at publish time
    await Promise.all([
      loadPartial("#header", `/partials/header.html?v=${v}`),
      loadPartial("#footer", `/partials/footer.html?v=${v}`),
    ])    
    .then(function () {
      // Other post-load work you already do...

      // Now apply the construction banner
      applyConstructionBanner();
    })
    .catch(function (err) {
      console.error('Error loading layout:', err);
      // Even if header/footer fail, you *could* still call applyConstructionBanner()
      // but it's fine to skip in that case.
    });

  // Light, pretty motivation: random quote (sourced from quotes.js if present)
  if (window.L8_QUOTES && Array.isArray(window.L8_QUOTES) && window.L8_QUOTES.length) {
    const pick = window.L8_QUOTES[Math.floor(Math.random() * window.L8_QUOTES.length)];
    showQuoteBubble(pick);
  }
});
