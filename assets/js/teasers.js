// /assets/js/teasers.js
// L8 homepage teasers — "From the Blog" and "From the L8 Podcast"
// Rotates through latest-per-pillar with intelligent first display.

(function () {
  "use strict";

  const L8_PATHS = {
    tags:    "/assets/meta/tags.json",
    blog:    "/blog/posts.json",
    podcast: "/podcast/episodes.json"
  };

  const PILLAR_ORDER = [
    "architecture-l8",
    "women-in-engineering",
    "mentoring-leadership",
    "health-resilience",
    "stories-reflections",
    "news-updates"
  ];

  const BLOG_ROTATION_MS = 18000;  // 18s
  const POD_ROTATION_MS  = 22000;  // 22s

  // --- Helpers -------------------------------------------------------------

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) {
      throw new Error("Failed to load " + path + " (" + res.status + ")");
    }
    return res.json();
  }

  function parseDate(value) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }

  function buildTagIndex(tagsArray) {
    const map = Object.create(null);
    for (const tag of tagsArray || []) {
      map[tag.id] = tag;
    }
    return map;
  }

  function findPrimaryPillar(entryTags) {
    if (!Array.isArray(entryTags)) return null;
    for (const pillarId of PILLAR_ORDER) {
      if (entryTags.includes(pillarId)) {
        return pillarId;
      }
    }
    return null;
  }

  function getPreferredPillar() {
    if (window.L8_PREFERRED_PILLAR && PILLAR_ORDER.includes(window.L8_PREFERRED_PILLAR)) {
      return window.L8_PREFERRED_PILLAR;
    }
    try {
      const stored = window.localStorage.getItem("l8PreferredPillar");
      if (stored && PILLAR_ORDER.includes(stored)) {
        return stored;
      }
    } catch (e) {}
    return "architecture-l8";
  }

  function latestPerPillar(entries) {
    const result = Object.create(null);
    for (const entry of entries || []) {
      const pillarId = findPrimaryPillar(entry.tags);
      if (!pillarId) continue;

      const existing = result[pillarId];
      if (!existing) {
        result[pillarId] = entry;
      } else {
        const existingDate = parseDate(existing.date);
        const candidateDate = parseDate(entry.date);
        if (candidateDate > existingDate) {
          result[pillarId] = entry;
        }
      }
    }
    return result;
  }

  function buildRotationArray(latestMap) {
    const availablePillars = PILLAR_ORDER.filter(id => !!latestMap[id]);
    if (!availablePillars.length) return [];

    const preferred = getPreferredPillar();
    let startIndex = availablePillars.indexOf(preferred);
    if (startIndex === -1) startIndex = 0;

    const ordered = [];
    for (let i = 0; i < availablePillars.length; i++) {
      const idx = (startIndex + i) % availablePillars.length;
      ordered.push(latestMap[availablePillars[idx]]);
    }
    return ordered;
  }

  function formatDateForCard(value) {
    const d = parseDate(value);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function getPillarTag(entry, tagIndex) {
    if (!Array.isArray(entry.tags)) return null;
    const pillarId = findPrimaryPillar(entry.tags);
    if (!pillarId) return null;
    return { id: pillarId, def: tagIndex[pillarId] || null };
  }

  // Local dev/prod path builder: always use local URLs, ignore canonical for teasers
  function getEntryUrl(entry) {
    const slug = entry.slug || "";
    if (!slug) return "#";

    if (entry.type === "podcast") {
      return "/podcast/" + encodeURIComponent(slug) + "/index.html";
    }
    return "/blog/" + encodeURIComponent(slug) + "/index.html";
  }

  function getEntryTeaser(entry) {
    return entry.summary || entry.teaser || "";
  }

  // --- DOM rendering -------------------------------------------------------

  function renderTeaserCard(container, entry, tagIndex, mediumType) {
    if (!container || !entry) return;

    const pillar = getPillarTag(entry, tagIndex);
    const pillarId = pillar && pillar.id;
    const pillarLabel = (pillar && pillar.def && pillar.def.label) || "";

    const url = getEntryUrl(entry);
    const dateText = formatDateForCard(entry.date);
    const teaser = getEntryTeaser(entry);

    const isBlog = mediumType === "blog";
    const mediumLabel = isBlog ? "Blog" : "Podcast Episode";
    const mediumIndexHref = isBlog ? "/pages/blog/index.html" : "/pages/podcast/index.html";
    const pillarHref = pillarId
      ? (mediumIndexHref + "?pillar=" + encodeURIComponent(pillarId))
      : mediumIndexHref;

    // Fade out
    container.classList.add("l8-teaser-card--transitioning");

    window.setTimeout(() => {
      container.innerHTML = `
        <div class="l8-teaser-card__shell">
          <div class="l8-teaser-card__meta">
            <a href="${mediumIndexHref}" class="l8-teaser-card__medium-link">${mediumLabel}</a>
            ${
              pillarLabel
                ? `<a href="${pillarHref}" class="l8-teaser-card__pill">${pillarLabel}</a>`
                : ""
            }
          </div>

          <a href="${url}" class="l8-teaser-card__title-link">
            <h3 class="l8-teaser-card__title">${entry.title}</h3>
            ${
              teaser
                ? `<p class="l8-teaser-card__teaser">${teaser}</p>`
                : ""
            }
          </a>

          <div class="l8-teaser-card__footer">
            <time datetime="${entry.date}" class="l8-teaser-card__date">${dateText}</time>
            <a href="${url}" class="l8-teaser-card__cta">Explore →</a>
          </div>
        </div>
      `;

      // Fade back in
      container.classList.remove("l8-teaser-card--empty");
      container.classList.remove("l8-teaser-card--transitioning");
      container.classList.add("l8-teaser-card--visible");
    }, 500); // half of CSS duration for a smooth crossfade
  }

  function setupRotation(containerId, rotationArray, tagIndex, mediumType, intervalMs) {
    if (!rotationArray.length) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    let currentIndex = 0;
    renderTeaserCard(container, rotationArray[currentIndex], tagIndex, mediumType);

    window.setInterval(() => {
      currentIndex = (currentIndex + 1) % rotationArray.length;
      renderTeaserCard(container, rotationArray[currentIndex], tagIndex, mediumType);
    }, intervalMs);
  }

  // --- Init ---------------------------------------------------------------

  async function initTeasers() {
    const blogContainer = document.getElementById("latest-blog-teaser");
    const podcastContainer = document.getElementById("latest-podcast-teaser");
    if (!blogContainer && !podcastContainer) return;

    try {
      const [tagsJson, blogJson, podcastJson] = await Promise.all([
        fetchJson(L8_PATHS.tags),
        blogContainer ? fetchJson(L8_PATHS.blog) : Promise.resolve([]),
        podcastContainer ? fetchJson(L8_PATHS.podcast) : Promise.resolve([])
      ]);

      const tagIndex = buildTagIndex(tagsJson);

      const blogEntries = Array.isArray(blogJson) ? blogJson : (blogJson.posts || []);
      const podcastEntriesRaw = Array.isArray(podcastJson) ? podcastJson : (podcastJson.episodes || []);
      const podcastEntries = podcastEntriesRaw.map(ep => ({ ...ep, type: "podcast" }));

      const latestBlogMap = latestPerPillar(blogEntries);
      const latestPodcastMap = latestPerPillar(podcastEntries);

      const blogRotation = buildRotationArray(latestBlogMap);
      const podcastRotation = buildRotationArray(latestPodcastMap);

      if (blogRotation.length && blogContainer) {
        setupRotation("latest-blog-teaser", blogRotation, tagIndex, "blog", BLOG_ROTATION_MS);
      }

      if (podcastRotation.length && podcastContainer) {
        setupRotation("latest-podcast-teaser", podcastRotation, tagIndex, "podcast", POD_ROTATION_MS);
      }
    } catch (err) {
      console.error("[L8 teasers] init failed:", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTeasers);
  } else {
    initTeasers();
  }
})();
