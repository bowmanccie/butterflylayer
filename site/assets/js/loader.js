async function inject(selector, url){
  const host = document.querySelector(selector);
  if(!host) return;
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    host.innerHTML = await res.text();
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await inject('#site-header', '/partials/header.html');
  await inject('#site-footer', '/partials/footer.html');
});
