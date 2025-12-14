// /site/assets/js/loader.js
/**
 * Loads HTML partials, wires the header/nav, fixes footer year,
 * and (optionally) shows a motivational quote bubble.
 * Also, supports construction mode via construction.json.
 */

const CONSTRUCTION_CONFIG_URL = '/assets/meta/construction.json?v=20251214051218';

// Quotes: preference + throttling (bubble only)
const L8_QUOTE_PREF_KEY = "l8.quoteCategory";
const L8_QUOTE_LAST_SHOWN_KEY = "l8.quoteLastShownAt";
const L8_QUOTE_COOLDOWN_HOURS_DEFAULT = 24;

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

function safeGetLocalStorage(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function safeSetLocalStorage(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
}

function getPageQuoteConfig() {
  // We’re using 1A: data attributes (template-driven)
  const el = document.body;

  const policy = (el.getAttribute("data-quote-policy") || "normal").trim(); // normal | quiet-only | off
  let mode = (el.getAttribute("data-quote-mode") || "bubble").trim();       // bubble | inline

  // Quiet pages are inline by design (enforce)
  if (policy === "quiet-only") mode = "inline";

  // Optional: inline target slot (we standardize on [data-quote-slot])
  const slot = document.querySelector("[data-quote-slot]");

  return { policy, mode, slot };
}

function getUserQuoteCategory() {
  const raw = (safeGetLocalStorage(L8_QUOTE_PREF_KEY) || "all").trim();
  return raw || "all";
}

function normalizeQuote(q) {
  return {
    text: q?.text || "",
    author: q?.author || "",
    category: (q?.category || "all").trim() || "all",
    weight: Number.isFinite(q?.weight) ? q.weight : 1
  };
}

function filterQuotesByCategory(quotes, category) {
  const cat = (category || "all").trim() || "all";
  return quotes.filter(q => (q.category || "all") === cat);
}

function weightedPick(quotes) {
  // All weights are 1 today, but logic supports future weighting.
  let total = 0;
  for (const q of quotes) {
    const w = Math.max(0, Number(q.weight) || 0);
    total += w;
  }
  if (total <= 0) return null;

  let r = Math.random() * total;
  for (const q of quotes) {
    const w = Math.max(0, Number(q.weight) || 0);
    r -= w;
    if (r <= 0) return q;
  }
  return quotes[quotes.length - 1] || null;
}

function shouldShowBubbleNow(cooldownHours) {
  const hours = Number.isFinite(cooldownHours) ? cooldownHours : L8_QUOTE_COOLDOWN_HOURS_DEFAULT;
  const cooldownMs = Math.max(1, hours) * 60 * 60 * 1000;

  const last = Number(safeGetLocalStorage(L8_QUOTE_LAST_SHOWN_KEY) || 0);
  const now = Date.now();

  if (!last) return true;
  return (now - last) >= cooldownMs;
}

function markBubbleShown() {
  safeSetLocalStorage(L8_QUOTE_LAST_SHOWN_KEY, String(Date.now()));
}

function renderInlineQuote(slot, quote) {
  if (!slot || !quote?.text) return;

  // “Not so bold”: render a simple blockquote only.
  slot.innerHTML = `
    <blockquote>
      <p>${quote.text}</p>
    </blockquote>
  `;
}

function initQuotes() {
  if (!window.L8_QUOTES || !Array.isArray(window.L8_QUOTES) || !window.L8_QUOTES.length) return;

  const { policy, mode, slot } = getPageQuoteConfig();
  if (policy === "off") return;

  // Make it mutable so we can enforce policy rules
  let all = window.L8_QUOTES.map(normalizeQuote).filter(q => q.text);

  // ✅ Rule 1: quiet quotes never appear on non-quiet pages
  if (policy !== "quiet-only") {
    all = all.filter(q => q.category !== "quiet");
  }

  // Effective category selection
  let effectiveCategory = "all";
  if (policy === "quiet-only") {
    effectiveCategory = "quiet";
  } else {
    effectiveCategory = getUserQuoteCategory();
    
    // ✅ Optional safety: user preference cannot be quiet on normal pages
    if (effectiveCategory === "quiet") effectiveCategory = "all";
  }

  // Category filter + fallback
  let pool = filterQuotesByCategory(all, effectiveCategory);

  // ✅ Rule 2: quiet-only pages must NEVER fall back to "all"
  if (!pool.length) {
    if (policy === "quiet-only") return;
    if (effectiveCategory !== "all") pool = filterQuotesByCategory(all, "all");
  }

  if (!pool.length) return;

  
  const pick = weightedPick(pool);
  if (!pick) return;

  if (mode === "inline") {
    renderInlineQuote(slot, pick);
    return;
  }

  // Bubble mode (throttled)
  if (!shouldShowBubbleNow(L8_QUOTE_COOLDOWN_HOURS_DEFAULT)) return;
  showQuoteBubble(pick);
  markBubbleShown();
}


/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  const v = "20251214051218"; // will be replaced at publish time
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

  // Quotes (policy + mode + category + throttling)
  initQuotes();
});
