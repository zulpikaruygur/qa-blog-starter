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
    loadPostsWithFallback()
      .then(posts => {
        const latest = posts.slice(0, 3);
        const wrap = document.getElementById('latestPosts');
        if (wrap) wrap.innerHTML = latest.map(p => postCardHTML(p)).join('');
      })
      .catch(err => {
        console.error('Failed to load posts.json from all candidate paths', err);
        const wrap = document.getElementById('latestPosts');
        const triedInfo = err && err.triedPaths ? `<details><summary>Details</summary><pre>${(err.triedPaths||[]).join('\n')}</pre></details>` : '';
        if (wrap) wrap.innerHTML = `<div class="subtle">Failed to load posts. Open via a local web server or try again.${triedInfo}</div>`;
      });
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


// Helper to load posts.json robustly across different hosting setups
async function loadPostsWithFallback() {
  const paths = candidatePostPaths();
  const tried = [];
  let lastErr;
  for (const path of paths) {
    const url = cacheBust(path);
    tried.push(url);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const data = await res.json();
      if (Array.isArray(data)) return data;
      throw new Error(`Invalid posts format from ${url}`);
    } catch (e) {
      lastErr = e;
    }
  }
  const inline = getInlinePosts();
  if (inline) return inline;
  const err = lastErr || new Error('Failed to load posts.json');
  err.triedPaths = tried;
  throw err;
}

function candidatePostPaths() {
  const unique = new Set();
  unique.add('./assets/data/posts.json');
  unique.add('assets/data/posts.json');
  try {
    const base = location.pathname.endsWith('/')
      ? location.pathname
      : location.pathname.replace(/[^/]+$/, '');
    unique.add(base + 'assets/data/posts.json');
  } catch (_) {}
  unique.add('/assets/data/posts.json');
  // Derive relative to executing script (main.js) src
  const fromScript = scriptBasedPostsPath();
  if (fromScript) unique.add(fromScript);
  return Array.from(unique);
}

function scriptBasedPostsPath() {
  try {
    const scripts = Array.from(document.scripts || []);
    const me = scripts.find(s => /assets\/js\/main\.js(?:\?|$)/.test(s.src)) || scripts[scripts.length - 1];
    if (!me || !me.src) return null;
    const url = new URL(me.src, window.location.href);
    const postsURL = new URL('../data/posts.json', url);
    return postsURL.href;
  } catch (_) {
    return null;
  }
}

function cacheBust(u) {
  try {
    const url = new URL(u, window.location.href);
    url.searchParams.set('v', String(Date.now()).slice(-6));
    return url.href;
  } catch (_) {
    return u;
  }
}

function getInlinePosts() {
  try {
    const el = document.getElementById('postsData');
    if (!el) return null;
    const json = el.textContent && el.textContent.trim();
    if (!json) return null;
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : null;
  } catch (_) {
    return null;
  }
}
