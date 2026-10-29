// Load: many concurrent HTTP requests against the real Express app (with fake stores).
const test = require('node:test');
const assert = require('node:assert');
const { stores } = require('./stores');
const app = require('./server');

stores.splice(0, stores.length, ...Array.from({ length: 41 }, (_, i) => ({
  id: `s${i}`,
  name: `Store ${i}`,
  search: async (q) => [{ title: `${q} ${i}`, price: 100 + i, url: `https://shop.test/${i}` }],
})));

let server, base;
test.before(() => new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
test.after(() => { server.close(); server.closeAllConnections(); });

// Fire `total` requests, `concurrency` at a time; returns statuses and per-request latency.
async function load(path, total, concurrency) {
  const statuses = [], times = [];
  let next = 0;
  const worker = async () => {
    while (next < total) {
      next++;
      const t0 = performance.now();
      const res = await fetch(base + path);
      await res.arrayBuffer();
      times.push(performance.now() - t0);
      statuses.push(res.status);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  times.sort((a, b) => a - b);
  return { statuses, p95: times[Math.floor(times.length * 0.95)] };
}

test('1000 health checks at 100 concurrent all succeed', async () => {
  const { statuses, p95 } = await load('/api/health', 1000, 100);
  assert.strictEqual(statuses.filter((s) => s === 200).length, 1000);
  assert.ok(p95 < 1000, `p95 ${p95.toFixed(0)}ms`);
});

test('1000 store-list requests at 100 concurrent all succeed', async () => {
  const { statuses, p95 } = await load('/api/stores', 1000, 100);
  assert.strictEqual(statuses.filter((s) => s === 200).length, 1000);
  assert.ok(p95 < 1000, `p95 ${p95.toFixed(0)}ms`);
});

test('2000 searches for a popular term are served from cache under load', async () => {
  await fetch(`${base}/api/search?q=earbuds`); // warm the cache
  const { statuses, p95 } = await load('/api/search?q=earbuds', 2000, 200);
  // Cache hits skip the per-visitor rate limit, so one busy IP still gets every answer.
  assert.strictEqual(statuses.filter((s) => s === 200).length, 2000);
  assert.ok(p95 < 1000, `p95 ${p95.toFixed(0)}ms`);
  const body = await (await fetch(`${base}/api/search?q=earbuds`)).json();
  assert.strictEqual(body.cached, true);
  assert.strictEqual(body.results.length, 41);
});
