document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => siteNav.classList.toggle('open'));
  }

  // Render latest posts on home
  if (document.getElementById('latestPosts')) {
    fetch('assets/data/posts.json')
      .then(r => r.json())
      .then(posts => {
        const latest = posts.slice(0, 3);
        const wrap = document.getElementById('latestPosts');
        wrap.innerHTML = latest.map(p => postCardHTML(p)).join('');
      })
      .catch(() => {});
  }
});

function postCardHTML(p) {
  const date = new Date(p.date).toLocaleDateString();
  const tags = p.tags.map(t => `<span class="tag" aria-label="tag">${t}</span>`).join(' ');
  return `<article class="card">
    <h3>${p.title}</h3>
    <p class="subtle">${date}</p>
    <p>${p.excerpt}</p>
    <div class="tags" aria-label="tags">${tags}</div>
    <a class="btn small" href="blog.html#${encodeURIComponent(p.slug)}">Read</a>
  </article>`;
}
