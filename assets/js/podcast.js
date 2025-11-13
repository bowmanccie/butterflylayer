// /site/assets/js/podcast.js
async function loadEpisodes(){
  try {
    const res = await fetch('/podcast/episodes.json', { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load episodes.json: ${res.status}`);
    const episodes = await res.json();

    const list = document.querySelector('#episodes');
    if(!list) return;

    list.innerHTML = episodes.map(ep => `
      <article class="episode">
        <span class="badge">${ep.duration ?? ''}</span>
        <h3>${ep.title}</h3>
        <p>${ep.summary ?? ''}</p>
        <p><small>${ep.date ?? ''}</small></p>
        <p>
          ${ep.audio ? `<a href="${ep.audio}" download>Audio MP3</a>&nbsp;` : ``}
          ${ep.video ? `<a href="${ep.video}">Watch MP4</a>&nbsp;` : ``}
          ${ep.manuscript ? `<a href="${ep.manuscript}">Manuscript</a>` : ``}
        </p>
      </article>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', loadEpisodes);
