// assets/js/quiet-layer.js
(function () {
  const root = document.querySelector("[data-quiet-root]");
  if (!root) return;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

  function titleCase(s) {
    return String(s || "")
      .trim()
      .split(/\s+/)
      .map(w => w ? (w[0].toUpperCase() + w.slice(1).toLowerCase()) : "")
      .join(" ");
  }

  function render(data) {
    const dateLine = [data.weekday, data.date].filter(Boolean).join(" • ");
    const feast = data.feast || "";
    const url = data.usccb_url || "";
    const mysteries = titleCase(data.rosary_mysteries); 

    const readings = Array.isArray(data.readings) ? data.readings : [];
    const lis = readings.map(r => {
      const label = esc(r.label || "");
      const cit = esc(r.citation || "");
      return `<li><strong>${label}</strong>${cit ? `: ${cit}` : ""}</li>`;
    }).join("");

    root.innerHTML = `
      ${dateLine ? `<p><small>${esc(dateLine)}</small></p>` : ""}
      ${mysteries ? `<p><span class="l8-pill">${esc(mysteries)} Mysteries</span></p>` : ""}
      ${feast ? `<h2>${esc(feast)}</h2>` : `<h2>Quiet Layer</h2>`}
      ${lis ? `<ul>${lis}</ul>` : `<p>No readings found.</p>`}
      ${url ? `<p><a href="${esc(url)}" target="_blank" rel="noopener">Open on USCCB</a></p>` : ""}
    `;
  }

  function renderEmpty() {
    root.innerHTML = `<p>Quiet Layer is not available yet.</p>`;
  }

  fetch("/assets/meta/quiet_daily.json", { cache: "no-store" })
    .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(render)
    .catch(renderEmpty);
})();
