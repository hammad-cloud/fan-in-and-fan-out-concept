// Live check that routing never skips a store which really stocks the item: for each routed word, ask the
// stores routeStores() would skip and list any that return matches. Re-run when adding stores or routing words.
const { stores } = require('./stores');
const { routeStores } = require('./search');
const { matchesQuery } = require('./relevance');

const WORDS = [
  'phone', 'iphone', 'mobile', 'samsung', 'xiaomi', 'redmi', 'infinix', 'tecno', 'oppo', 'vivo', 'realme', 'laptop',
  'macbook', 'tablet', 'ipad', 'earbuds', 'airpods', 'headphones', 'tv', 'monitor', 'power bank', 'speaker', 'camera',
  'kurta', 'kurti', 'shirt', 't shirt', 'lawn', 'suit', 'dress', 'jeans', 'trouser', 'shalwar', 'kameez', 'dupatta',
  'abaya', 'jacket', 'hoodie', 'polo', 'saree', 'unstitched', 'shawl',
];

const jobs = WORDS.flatMap((w) => {
  const asked = routeStores(w);
  return stores.filter((s) => !asked.includes(s)).map((s) => ({ w, s }));
});

async function main() {
  const hits = [];
  const failed = new Set();
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const { w, s } = jobs[next++];
      try {
        const items = await s.search(w, AbortSignal.timeout(10000));
        const m = items.filter((it) => it.title && it.price && matchesQuery(`${it.title} ${it.keywords ?? ''}`, w));
        if (m.length) hits.push(`${w}\t${s.id}\t${m.length}\t${m[0].title}`);
      } catch {
        failed.add(s.id);
      }
      await new Promise((r) => setTimeout(r, 300)); // stay under Shopify's rate limit
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  console.log(`${jobs.length} skipped-store checks. Matches (review each: real stock means fix the routing):`);
  console.log(hits.sort().join('\n') || '(none)');
  if (failed.size) console.log('Could not check:', [...failed].join(', '));
}

main();
