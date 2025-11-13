// /site/assets/js/loader.js
/**
 * Loads HTML partials, wires the header/nav, fixes footer year,
 * and (optionally) shows a motivational quote bubble.
 */

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
  // Mobile nav toggle (works even without CSS “open” class present)
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

  // If nav links were authored as root links (e.g. "/about/"),
  // remap them to /pages/... so local static browsing works nicely.
  const map = {
    "/": "/pages/",
    "/about/": "/pages/about/",
    "/work/": "/pages/resources/",
    "/writing/": "/pages/press/",
    "/podcast/": "/pages/podcast/",
    "/contact/": "/pages/contact/",
    "/privacy/": "/pages/privacy/",
  };
  root.querySelectorAll('nav a[href^="/"]').forEach(a => {
    const href = a.getAttribute("href");
    if (map[href]) a.setAttribute("href", map[href]);
  });

  // Mark active link (best-effort)
  const here = location.pathname.replace(/\/+$/, "");
  root.querySelectorAll("nav a").forEach(a => {
    const path = a.getAttribute("href")?.replace(/\/+$/, "");
    if (path && here.endsWith(path)) a.setAttribute("aria-current", "page");
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
  await Promise.all([
      loadPartial("#header", "/partials/header.html"),
      loadPartial("#footer", "/partials/footer.html"),
  ]);

  // Light, pretty motivation: random quote (sourced from quotes.js if present)
  if (window.L8_QUOTES && Array.isArray(window.L8_QUOTES) && window.L8_QUOTES.length) {
    const pick = window.L8_QUOTES[Math.floor(Math.random() * window.L8_QUOTES.length)];
    showQuoteBubble(pick);
  }
});
