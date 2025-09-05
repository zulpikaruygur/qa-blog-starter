let allPosts = [];
document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('postList');
  const searchInput = document.getElementById('searchInput');
  const tagList = document.getElementById('tagList');
  const hash = decodeURIComponent(location.hash.replace('#',''));

  fetch('assets/data/posts.json')
    .then(r => r.json())
    .then(posts => {
      allPosts = posts;
      renderTags(posts, tagList);
      renderPosts(posts, list);

      // If direct link to a post hash, open it
      if (hash) openPostModal(hash);
    });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    const filtered = allPosts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.tags.join(' ').toLowerCase().includes(q)
    );
    renderPosts(filtered, list);
  });

  tagList.addEventListener('click', (e) => {
    const el = e.target.closest('.tag');
    if (!el) return;
    const tag = el.dataset.tag;
    const active = el.classList.contains('active');
    document.querySelectorAll('#tagList .tag').forEach(t => t.classList.remove('active'));
    if (!active) el.classList.add('active');
    const chosen = !active ? tag : null;
    const filtered = chosen ? allPosts.filter(p => p.tags.includes(chosen)) : allPosts;
    renderPosts(filtered, list);
  });
});

function renderTags(posts, mount) {
  const tags = Array.from(new Set(posts.flatMap(p => p.tags))).sort();
  mount.innerHTML = tags.map(t => `<button class="tag" data-tag="${t}">${t}</button>`).join('');
}

function renderPosts(posts, mount) {
  if (!posts.length) {
    mount.innerHTML = `<p class="subtle">No posts found.</p>`;
    return;
  }
  mount.innerHTML = posts.map(postCardHTML).join('');
  // Attach inline reader
  mount.querySelectorAll('a.btn.small').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const slug = decodeURIComponent(a.getAttribute('href').split('#')[1]);
      openPostModal(slug);
    });
  });
}

function openPostModal(slug) {
  const post = allPosts.find(p => p.slug === slug);
  if (!post) return;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <article class="modal-card">
      <button class="modal-close" aria-label="Close">×</button>
      <h2>${post.title}</h2>
      <p class="subtle">${new Date(post.date).toLocaleDateString()} • ${post.tags.join(', ')}</p>
      <div class="post-body">${post.html}</div>
    </article>`;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');
  Prism.highlightAllUnder(modal);
  modal.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(modal));
  modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
}

function closeModal(m) {
  m.remove();
  document.body.classList.remove('modal-open');
}
