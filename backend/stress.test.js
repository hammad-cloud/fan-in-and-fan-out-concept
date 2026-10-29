// Stress: push searchAll past normal limits (many stores, failures, huge results, many distinct queries).
const test = require('node:test');
const assert = require('node:assert');
const { stores } = require('./stores');
const { searchAll } = require('./search');

// Replace the real adapters so no test hits a live site.
const useStores = (fakes) => stores.splice(0, stores.length, ...fakes);
// Titles echo the query so the relevance filter keeps them.
const item = (i, q = 'test') => ({ title: `${q} ${i}`, price: 1000 + i, url: `https://shop.test/p/${i}` });

test('half the stores failing in different ways never sinks the search', async () => {
  useStores(
    Array.from({ length: 40 }, (_, i) => ({
      id: `s${i}`,
      name: `Store ${i}`,
      search: async (q) => {
        if (i % 4 === 0) throw new Error('HTTP 500');
        if (i % 4 === 1) throw new Error('HTTP 429');
        return [item(i, q)];
      },
    }))
  );
  const { status, body } = await searchAll('phone failing', 'stress-1');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.sources.length, 40);
  assert.strictEqual(body.sources.filter((s) => s.ok).length, 20);
  assert.strictEqual(body.results.length, 20);
  assert.ok(body.sources.some((s) => s.error === 'busy, try again in a minute'));
});

test('a store that hangs is cut off by the timeout instead of blocking the search', { timeout: 15000 }, async () => {
  useStores([
    { id: 'fast', name: 'Fast', search: async (q) => [item(1, q)] },
    {
      id: 'hang',
      name: 'Hang',
      search: (q, signal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason))),
    },
  ]);
  const { body } = await searchAll('phone hang', 'stress-2');
  assert.deepStrictEqual(
    body.sources.map((s) => [s.id, s.ok, s.error]),
    [['fast', true, undefined], ['hang', false, 'timed out']]
  );
  assert.ok(body.totalMs < 9000);
});

test('50k results from one store are filtered and sorted without crashing', async () => {
  useStores([
    {
      id: 'big',
      name: 'Big',
      search: async (q) => Array.from({ length: 50000 }, (_, i) => ({ ...item(i, q), price: 50000 - i })),
    },
  ]);
  const { body } = await searchAll('phone big', 'stress-3');
  assert.strictEqual(body.results.length, 50000);
  assert.strictEqual(body.results[0].price, 1);
  assert.ok(body.results.every((r, i) => i === 0 || body.results[i - 1].price <= r.price));
});

test('garbage items from a store are dropped, not passed through', async () => {
  useStores([
    {
      id: 'junk',
      name: 'Junk',
      search: async () => [
        { title: '', price: 1, url: 'https://x.test' },
        { title: 'Test Phone', price: null, url: 'https://x.test' },
        { title: 'Test Phone', price: 5, url: 'not a url' },
        { title: 'Test Phone', price: 5, url: 'https://x.test/ok' },
      ],
    },
  ]);
  const { body } = await searchAll('test phone', 'stress-4');
  assert.deepStrictEqual(body.results.map((r) => r.url), ['https://x.test/ok']);
});

test('1000 distinct queries keep the cache bounded and the server responsive', async () => {
  let calls = 0;
  useStores([{ id: 'one', name: 'One', search: async (q) => (calls++, [item(0, q)]) }]);
  // Distinct IPs so the per-visitor rate limit doesn't hide the cache behaviour.
  const all = await Promise.all(Array.from({ length: 1000 }, (_, i) => searchAll(`query${i}`, `stress-ip-${i}`)));
  assert.ok(all.every((r) => r.status === 200));
  assert.strictEqual(calls, 1000);
  // Oldest queries were evicted (cache holds 500), newest are still served from cache.
  assert.strictEqual((await searchAll('query999', 'stress-x')).body.cached, true);
  assert.strictEqual((await searchAll('query0', 'stress-y')).body.cached, undefined);
});
