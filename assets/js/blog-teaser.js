// /site/assets/js/blog-teaser.js

document.addEventListener("DOMContentLoaded", async () => {
  const card = document.getElementById("blog-teaser-card");
  if (!card) return;

  const titleEl   = card.querySelector(".teaser-title");
  const summaryEl = card.querySelector(".teaser-summary");
  const metaEl    = card.querySelector(".teaser-meta");
  const tagsEl    = card.querySelector(".teaser-tags");
  const linkEl    = card.querySelector("a.link-arrow");

  try {
    // Adjust path if your blog JSON lives elsewhere, but per layout it should be /blog/posts.json
    const res = await fetch("/blog/posts.json", { cache: "no-store" });
    if (!res.ok) return;

    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) return;

    // Newest post by ISO date (YYYY-MM-DD)
    const sorted = posts.slice().sort((a, b) => {
      const ad = a.date || "";
      const bd = b.date || "";
      return bd.localeCompare(ad); // descending
    });
    const latest = sorted[0];
    
    const slug    = latest.slug || latest.id || "";
    const title   = latest.title || "Latest Post";
    const summary = latest.summary || latest.excerpt || "";
    const date    = latest.date_readable || latest.date || "";

    const tags    = latest.tags || [];

    if (titleEl) {
      titleEl.textContent = title;
    }

    if (summaryEl) {
      summaryEl.textContent = summary || "New writing from the Butterfly Layer.";
    }

    if (metaEl) {
      metaEl.textContent = date ? `Latest Post · ${date}` : "Latest Post";
    }

    if (tagsEl) {
      tagsEl.innerHTML = "";
      if (tags.length) {
        tags.slice(0, 3).forEach(tag => {
          const span = document.createElement("span");
          span.className = "tag";
          span.textContent = tag;
          tagsEl.appendChild(span);
        });
      }
    }

    if (linkEl && slug) {
      linkEl.href = `/blog/${slug}/`;
    }
  } catch (err) {
    console.error("Error loading blog teaser:", err);
    // UI will just show the fallback text in the card
  }
});
