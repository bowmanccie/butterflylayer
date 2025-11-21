// /site/assets/js/blog-list.js
async function loadBlogList() {
  const container = document.getElementById("blog-list");
  if (!container) return;

  try {
    const res = await fetch("/blog/posts.json?v=20251121183916");
    if (!res.ok) throw new Error("Failed to load posts.json");

    const posts = await res.json();

    if (!posts.length) {
      container.innerHTML = "<p>No posts yet. Check back soon.</p>";
      return;
    }

    // Newest first
    posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    container.innerHTML = posts
      .map((post) => {
        const date = post.date || "";
        const summary = post.summary || "";
        const slug = post.slug;
        const href = "/blog/" + slug + "/";

        const tags = (post.tags || [])
          .map((t) => `<span class="tag">${t}</span>`)
          .join(" ");

        return `
          <article class="card card-blog">
            <h2 class="card-title">
              <a href="${href}">${post.title}</a>
            </h2>
            <p class="card-meta">
              <time datetime="${date}">${date}</time>
              ${tags ? `<span class="card-tags">${tags}</span>` : ""}
            </p>
            <p class="card-summary">${summary}</p>
            <p class="card-cta">
              <a href="${href}" class="link-arrow">Read this post</a>
            </p>
          </article>
        `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Unable to load posts right now.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadBlogList);
