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
    })
    .catch(err => {
      console.error('Failed to load posts.json', err);
      if (list) list.innerHTML = `<p class="subtle">Failed to load posts. Please refresh.</p>`;
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
  const appendix = getPostAppendix(slug);
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <article class="modal-card">
      <button class="modal-close" aria-label="Close">×</button>
      <h2>${post.title}</h2>
      <p class="subtle">${new Date(post.date).toLocaleDateString()} • ${post.tags.join(', ')}</p>
      <div class="post-body">${post.html}${appendix}</div>
    </article>`;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  if (window.Prism && typeof Prism.highlightAllUnder === 'function') {
    Prism.highlightAllUnder(modal);
  }
  modal.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(modal));
  modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
}

function closeModal(m) {
  m.remove();
  document.body.style.overflow = '';
}

// Dynamically append extended content for specific posts without touching posts.json
function getPostAppendix(slug) {
  if (slug !== 'flaky-tests-what-really-works') return '';
  return `
    <hr />
    <h3>What Actually Works Against Flakiness</h3>
    <p>Below is a pragmatic, battle-tested checklist. Apply from top to bottom; stop when the signal stabilizes.</p>
    <ol>
      <li><strong>Kill implicit waits.</strong> Replace with deterministic conditions.</li>
      <li><strong>Stub nondeterminism.</strong> Network, clock, randomness, external systems.</li>
      <li><strong>Isolate test data.</strong> Make tests idempotent and independent.</li>
      <li><strong>Make retries smart.</strong> Retry at the edge with strong logging, not as a band-aid.</li>
      <li><strong>Stabilize CI.</strong> Parallelism, resources, and order independence.</li>
      <li><strong>Track and quarantine.</strong> Measure flake rate, quarantine aggressively, fix soon.</li>
    </ol>

    <h3>1) Deterministic Waits</h3>
    <p>Prefer waiting for state over sleeping. For UI, wait for network idle, visible elements, or specific API calls.</p>
    <pre><code class="language-javascript">// Playwright: wait for meaningful state
import { test, expect } from '@playwright/test';

test('adds to cart without flake', async ({ page }) => {
  await page.goto('https://shop.local');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  // wait for the cart API call instead of sleep
  await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/api/cart') && r.status() === 200),
    page.getByRole('button', { name: 'Checkout' }).waitFor({ state: 'visible' })
  ]);
  await expect(page.getByTestId('cart-count')).toHaveText('1');
});
</code></pre>

    <pre><code class="language-java">// Selenium + WebDriverWait: explicit condition
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
driver.findElement(By.id("add")) .click();
wait.until(ExpectedConditions.textToBe(By.cssSelector("#cart-count"), "1"));
</code></pre>

    <h3>2) Stub Nondeterminism</h3>
    <p>Remove external variability: stub network, freeze time, and control randomness.</p>
    <pre><code class="language-javascript">// Playwright: stub a flaky backend call
await page.route('**/recommendations', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [ { id: 1, name: 'Stable Item' } ] })
  });
});
</code></pre>

    <pre><code class="language-javascript">// Jest: control time and randomness
jest.useFakeTimers();
jest.spyOn(global.Math, 'random').mockReturnValue(0.42);
// ... run code that depends on timeouts/intervals
jest.advanceTimersByTime(5000);
</code></pre>

    <pre><code class="language-python"># Pytest: freeze time and stub randomness
from freezegun import freeze_time
import random

@freeze_time("2025-01-01 10:00:00")
def test_invoice_due_date():
    random.seed(123)
    assert compute_due_date() == "2025-01-31"
</code></pre>

    <h3>3) Test Data Isolation</h3>
    <p>Each test owns its data. Clean setup/teardown or use factories. Use unique keys to avoid cross-test collisions.</p>
    <pre><code class="language-python"># Pytest factory example with unique suffix
import uuid
import pytest

@pytest.fixture()
def user_payload():
    suffix = uuid.uuid4().hex[:8]
    return { 'email': f'test+{suffix}@example.com', 'name': 'QA' }

def test_create_user(api, user_payload):
    res = api.post('/users', json=user_payload)
    assert res.status_code == 201
</code></pre>

    <pre><code class="language-sql">-- Postgres: reset state between tests (transactional tests)
BEGIN;
-- run test operations
ROLLBACK;  -- database returns to clean slate
</code></pre>

    <h3>4) Smart Retries (When Justified)</h3>
    <p>Retries can mask real bugs. If you must retry, retry only known-flicker IO points and log everything.</p>
    <pre><code class="language-java">// JUnit 5: simple retry rule via extension
public class RetryExtension implements TestExecutionExceptionHandler {
  private static final int MAX_RETRIES = 2;
  @Override
  public void handleTestExecutionException(ExtensionContext ctx, Throwable ex) throws Throwable {
    Integer tries = ctx.getStore(ExtensionContext.Namespace.GLOBAL)
        .getOrComputeIfAbsent(ctx.getUniqueId(), k -> 0, Integer.class);
    if (tries < MAX_RETRIES) {
      ctx.getStore(ExtensionContext.Namespace.GLOBAL).put(ctx.getUniqueId(), tries + 1);
      throw new TestAbortedException("Retrying due to: " + ex.getMessage());
    }
    throw ex;
  }
}
</code></pre>

    <pre><code class="language-python"># Pytest: rerun failures with diagnostics
# pip install pytest-rerunfailures
@pytest.mark.flaky(reruns=2, reruns_delay=1)
def test_eventually_consistent(api):
    r = api.get('/status')
    assert r.json()['ready'] is True
</code></pre>

    <pre><code class="language-javascript">// Playwright Test: built-in retries in config
// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['junit', { outputFile: 'reports/junit.xml' }]],
});
</code></pre>

    <h3>5) CI Stability</h3>
    <p>Run tests hermetically: fixed resources, pinned browsers, and order-independent suites.</p>
    <pre><code class="language-yaml"># GitHub Actions: ensure resources and caching
jobs:
  tests:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --reporter=junit,line
</code></pre>

    <h3>6) Quarantine and Tracking</h3>
    <p>Quarantine known flakers to protect the main branch, but track and burn them down weekly.</p>
    <pre><code class="language-bash"># Example: run stable suite only
npx playwright test -g "@stable"  # tag stable tests
</code></pre>

    <pre><code class="language-sql">-- Flake detector: same test has both pass and fail in last 30 days
SELECT test_name,
       COUNT(*) FILTER (WHERE status = 'failed') AS fails,
       COUNT(*) FILTER (WHERE status = 'passed') AS passes
FROM test_results
WHERE occurred_at &gt; now() - interval '30 days'
GROUP BY test_name
HAVING COUNT(*) FILTER (WHERE status = 'failed') &gt; 0
   AND COUNT(*) FILTER (WHERE status = 'passed') &gt; 0
ORDER BY fails DESC;
</code></pre>

    <h3>Bonus: A Minimal Re-run Script</h3>
    <pre><code class="language-bash">#!/usr/bin/env bash
set -euo pipefail
npx playwright test || npx playwright test --last-failed
</code></pre>

    <p>Do the boring things first: deterministic waits, data isolation, and stubbing. Then add measured retries and quarantine. That combination eliminates 80–90% of flakiness in most pipelines.</p>
  `;
}
