// Security: rate limiting, hostile input, unsafe links from stores, and response headers.
const test = require('node:test');
const assert = require('node:assert');
const { stores } = require('./stores');
const app = require('./server');
const vercel = require('../vercel.json');

let lastQuery;
stores.splice(0, stores.length, {
  id: 'evil',
  name: 'Evil',
  search: async (q) => {
    lastQuery = q;
    return [
      { title: `${q} ok`, price: 1, url: 'https://shop.test/ok', image: 'javascript:alert(1)' },
      { title: `${q} js`, price: 2, url: 'javascript:alert(document.cookie)' },
      { title: `${q} data`, price: 3, url: 'data:text/html,<script>alert(1)</script>' },
      { title: `${q} file`, price: 4, url: 'file:///etc/passwd' },
    ];
  },
});

let server, base;
test.before(() => new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
test.after(() => { server.close(); server.closeAllConnections(); });

const get = (path, headers) => fetch(base + path, { headers });

test('only http(s) links from stores reach the client', async () => {
  const body = await (await get('/api/search?q=links')).json();
  assert.deepStrictEqual(body.results.map((r) => r.url), ['https://shop.test/ok']);
  assert.strictEqual(body.results[0].image, null);
});

test('hostile query shapes are rejected or handled, never a 500', async () => {
  const cases = ['/api/search', '/api/search?q=', '/api/search?q=a', '/api/search?q[]=ab&q[]=cd',
    '/api/search?q[$ne]=x', '/api/search?q=__proto__', '/api/search?q=%00%00', `/api/search?q=${'%F0%9F%92%A5'.repeat(500)}`];
  for (const path of cases) {
    const res = await get(path);
    assert.ok([200, 400, 429].includes(res.status), `${path} -> ${res.status}`);
    assert.match(res.headers.get('content-type'), /application\/json/);
  }
  assert.strictEqual((await get('/api/search?q=a')).status, 400);
});

test('query sent to stores is capped at 100 characters', async () => {
  await get(`/api/search?q=${'x'.repeat(5000)}`);
  assert.strictEqual(lastQuery.length, 100);
});

test('per-visitor rate limit blocks floods and cannot be dodged with X-Forwarded-For', async () => {
  const statuses = [];
  for (let i = 0; i < 15; i++) {
    statuses.push((await get(`/api/search?q=flood${i}`, { 'X-Forwarded-For': `10.0.0.${i}` })).status);
  }
  assert.ok(statuses.includes(429), String(statuses));
  const blocked = await get('/api/search?q=flood-new');
  assert.strictEqual(blocked.status, 429);
  assert.deepStrictEqual(Object.keys(await blocked.json()), ['error']);
});

test('responses do not advertise Express or leak stack traces', async () => {
  const res = await get('/api/does-not-exist');
  assert.strictEqual(res.headers.get('x-powered-by'), null);
  assert.doesNotMatch(await res.text(), /at .*\.js:\d+/);
  assert.strictEqual((await get('/api/health')).headers.get('x-powered-by'), null);
});

test('production sets the security headers (vercel.json)', () => {
  const headers = Object.fromEntries(vercel.headers[0].headers.map((h) => [h.key, h.value]));
  assert.strictEqual(vercel.headers[0].source, '/(.*)');
  assert.match(headers['Content-Security-Policy'], /default-src 'self'/);
  assert.match(headers['Content-Security-Policy'], /script-src 'self';/);
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.strictEqual(headers['X-Content-Type-Options'], 'nosniff');
  assert.strictEqual(headers['X-Frame-Options'], 'DENY');
  assert.match(headers['Strict-Transport-Security'], /max-age=\d{8}/);
});
