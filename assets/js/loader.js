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
  const v = "20251121183916"; // will be replaced at publish time
    await Promise.all([
      loadPartial("#header", `/partials/header.html?v=${v}`),
      loadPartial("#footer", `/partials/footer.html?v=${v}`),
    ]);

  // Light, pretty motivation: random quote (sourced from quotes.js if present)
  if (window.L8_QUOTES && Array.isArray(window.L8_QUOTES) && window.L8_QUOTES.length) {
    const pick = window.L8_QUOTES[Math.floor(Math.random() * window.L8_QUOTES.length)];
    showQuoteBubble(pick);
  }
});
