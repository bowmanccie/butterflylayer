// /assets/js/blog-teaser.js
document.addEventListener("DOMContentLoaded", async () => {
  const teaser = document.getElementById("blog-teaser");
  if (!teaser) return;

  try {
    const res = await fetch("/blog/posts.json");
    if (!res.ok) throw new Error("Failed to fetch posts.json");

    const posts = await res.json();

    if (!posts.length) {
      teaser.innerHTML = "<p>No posts yet. Check back soon.</p>";
      return;
    }

    // Newest post first (YYYY-MM-DD sorts correctly as strings)
    posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const post = posts[0];

    const href = "/blog/" + post.slug + "/";
    const date = post.date || "";
    const summary = post.summary || "";
    const tags = (post.tags || [])
      .map(t => `<span class="tag">${t}</span>`)
      .join(" ");

    teaser.innerHTML = `
      <h4 class="teaser-title"><a href="${href}">${post.title}</a></h4>
      <p class="teaser-meta">
        ${date ? `<time datetime="${date}">${date}</time>` : ""}
        ${tags ? `<span class="teaser-tags">${tags}</span>` : ""}
      </p>
      <p class="teaser-summary">${summary}</p>
      <p class="teaser-cta"><a href="${href}" class="link-arrow">Read this post</a></p>
    `;
  } catch (err) {
    console.error(err);
    teaser.innerHTML = "<p>Unable to load latest post.</p>";
  }
});
