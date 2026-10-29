// Performance: the fan-out must run stores in parallel, and cache/filter paths must stay fast.
const test = require('node:test');
const assert = require('node:assert');
const { stores } = require('./stores');
const { searchAll } = require('./search');
const { matchesQuery } = require('./relevance');

const useStores = (fakes) => stores.splice(0, stores.length, ...fakes);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slowStore = (i, ms) => ({
  id: `s${i}`,
  name: `Store ${i}`,
  search: async (q) => (await sleep(ms), [{ title: `${q} ${i}`, price: 100 + i, url: `https://shop.test/${i}` }]),
});

test('41 stores of 200ms each finish in about 200ms, not 8s (parallel fan-out)', async () => {
  useStores(Array.from({ length: 41 }, (_, i) => slowStore(i, 200)));
  const t0 = performance.now();
  const { body } = await searchAll('parallel', 'perf-1');
  const ms = performance.now() - t0;
  assert.strictEqual(body.results.length, 41);
  assert.ok(ms < 600, `took ${ms.toFixed(0)}ms`);
});

test('total time follows the slowest store, not the sum', async () => {
  useStores([slowStore(1, 50), slowStore(2, 300), slowStore(3, 100)]);
  const { body } = await searchAll('slowest', 'perf-2');
  assert.ok(body.totalMs >= 290 && body.totalMs < 600, `took ${body.totalMs}ms`);
  assert.ok(body.sources.find((s) => s.id === 's2').ms >= 290);
});

test('cached search answers in under 5ms without calling stores again', async () => {
  let calls = 0;
  useStores([{ ...slowStore(1, 200), search: async (q) => (calls++, await sleep(200), [{ title: q, price: 1, url: 'https://a.test' }]) }]);
  await searchAll('cache me', 'perf-3');
  const t0 = performance.now();
  const { body } = await searchAll('Cache Me', 'perf-3'); // case-insensitive key
  const ms = performance.now() - t0;
  assert.strictEqual(body.cached, true);
  assert.strictEqual(calls, 1);
  assert.ok(ms < 5, `took ${ms.toFixed(2)}ms`);
});

test('relevance filter handles 100k titles in under 1s', () => {
  const titles = Array.from({ length: 100000 }, (_, i) => `Wireless Earbuds Model ${i} with Charging Case`);
  const t0 = performance.now();
  const kept = titles.filter((t) => matchesQuery(t, 'wireless earbuds case'));
  const ms = performance.now() - t0;
  assert.strictEqual(kept.length, 100000);
  assert.ok(ms < 1000, `took ${ms.toFixed(0)}ms`);
});
