const test = require('node:test');
const assert = require('node:assert');
const { safeUrl } = require('./search');

test('safeUrl only allows http(s) links', () => {
  assert.strictEqual(safeUrl('https://www.daraz.pk/products/x.html'), 'https://www.daraz.pk/products/x.html');
  assert.strictEqual(safeUrl('javascript:alert(1)'), null);
  assert.strictEqual(safeUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.strictEqual(safeUrl('//no-protocol.com/x'), null);
  assert.strictEqual(safeUrl(undefined), null);
});

test('routes searches away from stores that cannot carry the item', async () => {
  const { stores } = require('./stores');
  const asked = [];
  const fake = (id, category) => ({
    id, name: id, category,
    search: async (q) => (asked.push(id), [{ title: q, price: 100, url: `https://${id}.pk/x` }]),
  });
  stores.splice(0, stores.length, fake('daraz', 'Marketplaces & Electronics'), fake('priceoye', 'Marketplaces & Electronics'),
    fake('khaadi', 'Fashion'), fake('dvago', 'Beauty & Pharmacy'), fake('telemart', 'Marketplaces & Electronics'));
  const { searchAll } = require('./search');

  await searchAll('iphone 15', 'route-1');
  assert.deepStrictEqual(asked.sort(), ['daraz', 'dvago', 'priceoye', 'telemart']);

  asked.length = 0;
  const { body } = await searchAll('lawn suit', 'route-2');
  assert.deepStrictEqual(asked.sort(), ['daraz', 'dvago', 'khaadi', 'telemart']); // general marketplaces are always asked
  assert.deepStrictEqual(body.sources.map((s) => s.id).sort(), ['daraz', 'dvago', 'khaadi', 'telemart']);
});
