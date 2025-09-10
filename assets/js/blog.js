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
  // Flaky tests appendix
  if (slug === 'flaky-tests-what-really-works') {
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
    return { 'email': f'test+${'{' }suffix{'}'}@example.com', 'name': 'QA' }

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
`;
  }

  // API-first shift-left appendix
  if (slug === 'shift-left-api-first-testing') {
    return `
    <hr />
    <h3>Practical API‑First, Shift‑Left Playbook</h3>
    <p>Below are concrete patterns and code you can copy into a greenfield or brownfield project to shift testing left by starting with the API.</p>

    <h4>1) Specify First with OpenAPI</h4>
    <p>Start from a contract. Treat it as the single source of truth for clients, servers, mocks, and tests.</p>
    <pre><code class="language-yaml"># openapi.yaml (excerpt)
openapi: 3.0.3
info:
  title: Orders API
  version: 1.0.0
paths:
  /orders:
    post:
      summary: Create order
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/NewOrder'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Order' }
components:
  schemas:
    NewOrder:
      type: object
      required: [customerId, items]
      properties:
        customerId: { type: string }
        items:
          type: array
          minItems: 1
          items:
            type: object
            required: [sku, qty]
            properties:
              sku: { type: string }
              qty: { type: integer, minimum: 1 }
    Order:
      allOf:
        - $ref: '#/components/schemas/NewOrder'
        - type: object
          properties:
            id: { type: string }
            status: { type: string, enum: [CREATED, PAID, SHIPPED] }
</code></pre>

    <h4>2) Generate Clients, Servers, and Tests</h4>
    <p>Use the spec to scaffold artifacts and reduce hand-written boilerplate.</p>
    <pre><code class="language-bash"># Generate a TypeScript client
openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o gen/ts-client

# Generate a Node Express server stub
openapi-generator-cli generate -i openapi.yaml -g nodejs-express-server -o gen/express-server
</code></pre>

    <h4>3) Validate Requests/Responses at Runtime</h4>
    <p>Fail fast by validating traffic against the schema in dev and tests.</p>
    <pre><code class="language-javascript">// Express.js with openapi-validator-middleware
import express from 'express';
import { OpenApiValidator } from 'express-openapi-validator';

const app = express();
app.use(express.json());
await new OpenApiValidator({ apiSpec: 'openapi.yaml' }).install(app);

app.post('/orders', (req, res) => {
  // If we reach here, req.body matches NewOrder schema
  res.status(201).json({ ...req.body, id: 'o_123', status: 'CREATED' });
});
</code></pre>

    <h4>4) Fast API Tests at the Unit/Integration Layer</h4>
    <pre><code class="language-java">// REST Assured + JUnit 5: happy path and contract assertions
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;
import org.junit.jupiter.api.*;

@Test
void createOrder_201() {
  given()
    .contentType("application/json")
    .body("{\\"customerId\\":\\"c_1\\",\\"items\\":[{\\"sku\\":\\"A1\\",\\"qty\\":1}]}")
  .when()
    .post("/orders")
  .then()
    .statusCode(201)
    .body("id", notNullValue())
    .body("status", equalTo("CREATED"));
}
</code></pre>

    <pre><code class="language-javascript">// Supertest + Jest: Node example
import request from 'supertest';
import { app } from '../app';

test('POST /orders creates order', async () => {
  const res = await request(app)
    .post('/orders')
    .send({ customerId: 'c_1', items: [{ sku: 'A1', qty: 1 }] })
    .expect(201);
  expect(res.body).toMatchObject({ status: 'CREATED' });
});
</code></pre>

    <h4>5) Mock Early, Parallelize Teams</h4>
    <p>Unblock UI and partner teams using generated mocks.</p>
    <pre><code class="language-bash"># Prism: mock server directly from OpenAPI
npx @stoplight/prism-cli mock openapi.yaml --port 4010
</code></pre>

    <h4>6) Consumer‑Driven Contract Testing</h4>
    <pre><code class="language-javascript">// Pact JS: define consumer expectations
import { Pact } from '@pact-foundation/pact';
import path from 'path';
const provider = new Pact({
  consumer: 'WebApp',
  provider: 'OrdersAPI',
  dir: path.resolve(process.cwd(), 'pacts')
});

await provider.setup();
await provider.addInteraction({
  state: 'order can be created',
  uponReceiving: 'a valid order',
  withRequest: {
    method: 'POST', path: '/orders', headers: { 'Content-Type': 'application/json' },
    body: { customerId: 'c_1', items: [{ sku: 'A1', qty: 1 }] }
  },
  willRespondWith: {
    status: 201, headers: { 'Content-Type': 'application/json' },
    body: { id: like('o_123'), status: 'CREATED' }
  }
});
// exercise consumer -> provider.mockService
// then write pact file and verify on provider CI
</code></pre>

    <h4>7) Performance Early</h4>
    <pre><code class="language-javascript">// k6: lightweight load smoke
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 5, duration: '30s' };

export default function () {
  const res = http.post('http://localhost:3000/orders', JSON.stringify({
    customerId: 'c_1', items: [{ sku: 'A1', qty: 1 }]
  }), { headers: { 'Content-Type': 'application/json' } });
  check(res, { '201': r => r.status === 201 });
  sleep(1);
}
</code></pre>

    <h4>8) Smoke in CI with Newman</h4>
    <pre><code class="language-bash"># Postman CLI or Newman to run a regression on each PR
newman run collection.json -e env.json --bail --reporters cli,junit
</code></pre>

    <h4>9) Wire it into CI</h4>
    <pre><code class="language-yaml"># GitHub Actions (excerpt)
name: api-ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Install
        run: npm ci
      - name: Unit & API tests
        run: npm test -- --reporter=junit
      - name: Contract verify
        run: npm run pact:verify
      - name: k6 smoke
        run: k6 run test/k6/orders-smoke.js
</code></pre>

    <h4>10) A Thin, Reliable E2E</h4>
    <p>Keep end‑to‑end UI tests few and user‑journey focused. Assert API effects instead of pixel details.</p>

    <h4>Key Takeaways</h4>
    <ul>
      <li>Treat the API contract as the product. Everything else is a build artifact.</li>
      <li>Validate traffic against the schema to fail fast.</li>
      <li>Favor consumer‑driven contracts over heavy end‑to‑end tests for integration confidence.</li>
      <li>Start performance and security checks on endpoints during development, not at release time.</li>
    </ul>
    `;
  }

  return '';
}
