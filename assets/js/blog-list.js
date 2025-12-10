// /assets/js/blog-list.js
document.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("blog-list");
  if (!listEl) return;

  const PAGE_SIZE = 6;

  function parseDate(value) {
    if (!value) return new Date(0);

    // If it's a plain YYYY-MM-DD, treat it as a local calendar date
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }

  function formatDateForMeta(value) {
    const d = parseDate(value);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function getCurrentPage() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("page");
    const n = raw ? parseInt(raw, 10) : 1;
    return Number.isNaN(n) || n < 1 ? 1 : n;
  }

  function renderPagination(totalPosts) {
    const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));
    const current = getCurrentPage();
    if (totalPages <= 1) return;

    const nav = document.createElement("nav");
    nav.className = "blog-pagination";

    const prevPage = current > 1 ? current - 1 : null;
    const nextPage = current < totalPages ? current + 1 : null;

    if (prevPage) {
      const a = document.createElement("a");
      a.href = prevPage === 1 ? "?page=1" : `?page=${prevPage}`;
      a.className = "blog-pagination-link";
      a.textContent = "← Newer posts";
      nav.appendChild(a);
    }

    if (nextPage) {
      const a = document.createElement("a");
      a.href = `?page=${nextPage}`;
      a.className = "blog-pagination-link";
      a.textContent = "Older posts →";
      nav.appendChild(a);
    }

    listEl.parentElement.appendChild(nav);
  }

  function normalizeTags(raw) {
    if (Array.isArray(raw)) return raw;
    if (!raw) return [];
    // handle "tag1, tag2" string just in case
    return String(raw)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  fetch("/blog/posts.json?v=20251209222457")
    .then((res) => {
      if (!res.ok) throw new Error("Unable to load posts.json");
      return res.json();
    })
    .then((posts) => {
      if (!Array.isArray(posts) || posts.length === 0) {
        listEl.innerHTML = "<p>No posts are published yet. Check back soon.</p>";
        return;
      }

      // Newest → oldest
      const sorted = posts.slice().sort((a, b) => {
        const ad = a.date || "";
        const bd = b.date || "";
        return bd.localeCompare(ad);
      });

      const page = getCurrentPage();
      const start = (page - 1) * PAGE_SIZE;
      const current = sorted.slice(start, start + PAGE_SIZE);

      const frag = document.createDocumentFragment();

      current.forEach((post) => {
        const slug = post.slug;
        if (!slug) return;

        const url = `/blog/${slug}/`;

        const title = post.title || slug;
        const date = post.date || "";
        const tags = normalizeTags(post.tags);
        const summary =
          post.summary ||
          "An essay from the Butterfly Layer — architecture, AI, and the human layer of networks.";

        const thumbSrc =
          post.thumbnail ||
          "/assets/img/ui/hero-butterfly-wow.svg?v=20251209222457";

        const card = document.createElement("article");
        card.className = "pub-item thumb-card";

        const metaText = date ? formatDateForMeta(date) : "";

        const tagsHtml = tags.length
          ? `<p class="blog-card-tags">${tags
              .map((tag) => `<span class="tag">${tag}</span>`)
              .join("")}</p>`
          : "";

        card.innerHTML = `
          <a href="${url}" class="thumb-link" aria-label="${title}">
            <img class="thumb" src="${thumbSrc}" alt="">
          </a>
          <div class="thumb-content">
            <h3>
              <a href="${url}">${title}</a>
            </h3>
            ${metaText ? `<p class="meta">${metaText}</p>` : ""}
            <p>${summary}</p>
            ${tagsHtml}
          </div>
        `;

        frag.appendChild(card);
      });

      listEl.innerHTML = "";
      listEl.appendChild(frag);
      renderPagination(sorted.length);
    })
    .catch((err) => {
      console.error(err);
      listEl.innerHTML = "<p>Blog posts could not be loaded right now.</p>";
    });
});
