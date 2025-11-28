// /assets/js/pillar-filters.js
// Pillar-based filtering for Blog and Podcast index pages.
// Uses ?pillar=<pillar-id> in the URL, tags.json for labels, and posts/episodes JSON as sources.

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

  // Adjust this to whatever butterfly/thumb art you prefer
  const L8_DEFAULT_THUMB = "/assets/img/ui/hero-butterfly-wow.svg";

  // --- URL & preference helpers --------------------------------------------

  function getSelectedPillarFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const pillar = params.get("pillar");
    return pillar || null;
  }

  function setSelectedPillarInUrl(pillarId) {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    if (!pillarId) {
      params.delete("pillar");
    } else {
      params.set("pillar", pillarId);
    }
    url.search = params.toString();
    window.history.replaceState({}, "", url.toString());
  }

  function savePreferredPillar(pillarId) {
    try {
      if (pillarId) {
        window.localStorage.setItem("l8PreferredPillar", pillarId);
      }
    } catch (e) {
      // ignore
    }
  }

  function parseDate(value) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) {
      throw new Error("Failed to load " + path + " (" + res.status + ")");
    }
    return res.json();
  }

  function buildTagIndex(tagsArray) {
    const map = Object.create(null);
    for (const tag of tagsArray || []) {
      map[tag.id] = tag;
    }
    return map;
  }

  function getPillarTags(tagsArray) {
    return (tagsArray || []).filter(t => t.category === "pillar");
  }

  function itemHasPillar(item, pillarId) {
    if (!pillarId) return true;
    if (!Array.isArray(item.tags)) return false;
    return item.tags.includes(pillarId);
  }

  function sortByDateDesc(items) {
    return [...items].sort((a, b) => parseDate(b.date) - parseDate(a.date));
  }

  function getEntryUrl(medium, item) {
    const slug = item.slug || "";
    if (!slug) return "#";
    if (medium === "podcast") {
      return "/podcast/" + encodeURIComponent(slug) + "/index.html";
    }
    return "/blog/" + encodeURIComponent(slug) + "/index.html";
  }

  function getItemTeaser(item) {
    return item.summary || item.teaser || "";
  }

  function findPrimaryPillar(item, pillarIds) {
    if (!Array.isArray(item.tags)) return null;
    for (const pid of pillarIds) {
      if (item.tags.includes(pid)) return pid;
    }
    return null;
  }

  // --- Rendering -----------------------------------------------------------

  function renderFilterBar(rootEl, medium, pillarTags, items, selectedPillar) {
    if (!rootEl) return;

    const pillarIdsWithContent = new Set();
    for (const item of items) {
      if (!Array.isArray(item.tags)) continue;
      for (const p of pillarTags) {
        if (item.tags.includes(p.id)) {
          pillarIdsWithContent.add(p.id);
        }
      }
    }

    const hasContent = id => pillarIdsWithContent.has(id);

    const orderedPillars = PILLAR_ORDER
      .map(id => pillarTags.find(t => t.id === id))
      .filter(Boolean)
      .filter(t => hasContent(t.id));

    const parts = [];

    // "All" pill
    parts.push(`
      <button
        type="button"
        class="l8-pill-filter__pill l8-teaser-card__pill ${selectedPillar ? "" : "is-active"}"
        data-pillar=""
      >
        All
      </button>
    `);

    for (const tag of orderedPillars) {
      const activeClass = selectedPillar === tag.id ? "is-active" : "";
      parts.push(`
        <button
          type="button"
          class="l8-pill-filter__pill l8-teaser-card__pill ${activeClass}"
          data-pillar="${tag.id}"
        >
          ${tag.label}
        </button>
      `);
    }

    rootEl.innerHTML = parts.join("");

    rootEl.querySelectorAll(".l8-pill-filter__pill").forEach(btn => {
      btn.addEventListener("click", () => {
        const pillarId = btn.getAttribute("data-pillar") || null;
        setSelectedPillarInUrl(pillarId);
        if (pillarId) {
          savePreferredPillar(pillarId);
        }
        // Re-render list and active state
        renderFilterBar(rootEl, medium, pillarTags, items, pillarId);
        renderItemList(
          medium,
          document.getElementById(medium === "blog" ? "blog-list" : "podcast-list"),
          items,
          pillarTags,
          pillarId
        );
      });
    });
  }

    function renderItemList(medium, listEl, items, pillarTags, selectedPillar) {
    if (!listEl) return;

    const pillarIds = pillarTags.map(t => t.id);
    const pillarIdSet = new Set(pillarIds);

    const filtered = sortByDateDesc(items).filter(item => itemHasPillar(item, selectedPillar));

    if (!filtered.length) {
        listEl.innerHTML = `
        <p class="l8-card-list__empty">
            No ${medium === "blog" ? "blog posts" : "episodes"} in this layer yet.
        </p>
        `;
        return;
    }

    const cards = filtered.map(item => {
        const url = getEntryUrl(medium, item);
        const teaser = getItemTeaser(item);
        const dateText = parseDate(item.date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
        });

        const primaryPillarId = findPrimaryPillar(item, pillarIds);
        const primaryPillarTag = primaryPillarId
        ? pillarTags.find(t => t.id === primaryPillarId)
        : null;
        const primaryPillarLabel = primaryPillarTag ? primaryPillarTag.label : "";

        // Non-pillar tags for the meta line: layer8, architecture, mindset, etc.
        const nonPillarTags = (item.tags || []).filter(t => !pillarIdSet.has(t));
        const metaParts = [dateText];
        if (nonPillarTags.length) {
        metaParts.push(nonPillarTags.join(", "));
        }
        const metaLine = metaParts.join(" • ");

        // Optional thumbnail support later: item.thumb || L8_DEFAULT_THUMB
        const thumbSrc = item.thumb || L8_DEFAULT_THUMB;

        return `
        <article class="l8-list-card l8-list-card--${medium}">
            <a href="${url}" class="l8-list-card__link">
            <div class="l8-list-card__inner">
                <div class="l8-list-card__thumb">
                <div class="l8-list-card__thumb-bar"></div>
                <img src="${thumbSrc}" alt="" class="l8-list-card__thumb-img" loading="lazy" />
                </div>
                <div class="l8-list-card__body">
                ${
                    primaryPillarLabel
                    ? `<div class="l8-list-card__pill-row">
                        <span class="l8-list-card__pillar l8-teaser-card__pill">${primaryPillarLabel}</span>
                        </div>`
                    : ""
                }
                <h2 class="l8-list-card__title">${item.title}</h2>
                ${metaLine ? `<p class="l8-list-card__meta">${metaLine}</p>` : ""}
                ${teaser ? `<p class="l8-list-card__teaser">${teaser}</p>` : ""}
                </div>
            </div>
            </a>
        </article>
        `;
    });

    listEl.innerHTML = cards.join("");
    }

  // --- Medium-specific init -----------------------------------------------

  async function initMedium(medium) {
    const filterId = medium === "blog" ? "blog-filter-bar" : "podcast-filter-bar";
    const listId   = medium === "blog" ? "blog-list"       : "podcast-list";

    const filterEl = document.getElementById(filterId);
    const listEl   = document.getElementById(listId);
    if (!filterEl || !listEl) return;

    try {
      const [tagsJson, itemsJson] = await Promise.all([
        fetchJson(L8_PATHS.tags),
        fetchJson(medium === "blog" ? L8_PATHS.blog : L8_PATHS.podcast)
      ]);

      const tagIndex  = buildTagIndex(tagsJson || []);
      const pillarTags = getPillarTags(tagsJson || []);

      const rawItems = Array.isArray(itemsJson)
        ? itemsJson
        : (itemsJson.posts || itemsJson.episodes || []);

      // Mark podcast entries with type if needed (for consistency with other scripts)
      const items = rawItems.map(it => (medium === "podcast" ? { ...it, type: "podcast" } : it));

      const selectedPillar = getSelectedPillarFromUrl();

      renderFilterBar(filterEl, medium, pillarTags, items, selectedPillar);
      renderItemList(medium, listEl, items, pillarTags, selectedPillar);
    } catch (err) {
      console.error("[L8 pillar filters] init failed for " + medium + ":", err);
    }
  }

  function init() {
    // Only init for pages that have the relevant containers
    if (document.getElementById("blog-list")) {
      initMedium("blog");
    }
    if (document.getElementById("podcast-list")) {
      initMedium("podcast");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
