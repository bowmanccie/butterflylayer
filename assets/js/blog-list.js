// /assets/js/blog-list.js
document.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("blog-list");
  if (!listEl) return;

  // posts.json generated at build time
  // (lives at /blog/posts.json in your tree)
  fetch("/blog/posts.json?v=20251121225148")
    .then((res) => {
      if (!res.ok) throw new Error("Unable to load posts.json");
      return res.json();
    })
    .then((posts) => {
      if (!Array.isArray(posts) || posts.length === 0) {
        listEl.innerHTML = "<p>No posts are published yet. Check back soon.</p>";
        return;
      }

      const frag = document.createDocumentFragment();

      posts.forEach((post) => {
        const slug = post.slug;
        if (!slug) return;

        // In your repo, posts are at /blog/<slug>/index.html
        const url = `/blog/${slug}/`;

        const title = post.title || slug;
        const date = post.date || "";
        const tags = Array.isArray(post.tags)
          ? post.tags.join(", ")
          : (post.tags || "");
        const summary =
          post.summary ||
          "An essay from the Butterfly Layer — architecture, AI, and the human layer of networks.";

        // Optional thumbnail from posts.json; otherwise use a known-good image
        const thumbSrc =
          post.thumbnail ||
          "/assets/img/ui/hero-butterfly-wow.svg?v=20251121225148";

        const card = document.createElement("article");
        // pub-item gives hover lift; thumb-card gives layout + accent
        card.className = "pub-item thumb-card";

        card.innerHTML = `
          <a href="${url}" class="thumb-link" aria-label="${title}">
            <img class="thumb" src="${thumbSrc}" alt="">
          </a>
          <div class="thumb-content">
            <h3>
              <a href="${url}">${title}</a>
            </h3>
            <p class="meta">
              ${[date, tags].filter(Boolean).join(" • ")}
            </p>
            <p>${summary}</p>
          </div>
        `;

        frag.appendChild(card);
      });

      listEl.innerHTML = "";
      listEl.appendChild(frag);
    })
    .catch((err) => {
      console.error(err);
      listEl.innerHTML = "<p>Blog posts could not be loaded right now.</p>";
    });
});
