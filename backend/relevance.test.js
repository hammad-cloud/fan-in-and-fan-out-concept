const test = require('node:test');
const assert = require('node:assert');
const { matchesQuery, isAccessory, queryKind } = require('./relevance');

test('keeps titles containing every query word', () => {
  assert.ok(matchesQuery('Xiaomi Redmi Buds 8 Lite Wireless Earbuds', 'earbuds'));
  assert.ok(matchesQuery('Unstitched 3 Piece Lawn Suit', 'lawn suit'));
  assert.ok(matchesQuery('Wireless Earbud Pro', 'Earbuds'));
  assert.ok(matchesQuery('Ronin R-08 Smartwatch', 'smart watch'));
  assert.ok(matchesQuery('Panadol Children’s Liquid 120ml', 'panadol'));
});

test('drops unrelated titles', () => {
  assert.ok(!matchesQuery('3 Piece Printed Lawn Suit', 'earbuds'));
  assert.ok(!matchesQuery('Printed Lawn Shirt', 'lawn suit'));
  assert.ok(!matchesQuery('Royal Mirage Body Spray', 'deodorant'));
});

test('flags accessories unless the query asks for one', () => {
  assert.ok(isAccessory('Type-C Cable for iPhone 15', 'iphone'));
  assert.ok(isAccessory('iPhone 14 Pro Silicone Case', 'iPhone'));
  assert.ok(isAccessory('iPhone Tempered Glass Screen Protector', 'iphone'));
  assert.ok(!isAccessory('Apple iPhone 15 128GB', 'iphone'));
  assert.ok(!isAccessory('iPhone 14 Pro Silicone Case', 'iphone case'));
  assert.ok(!isAccessory('Apple iPhone 15 128GB', 'iphone cable'));
});

test('classifies queries so search can skip unrelated stores', () => {
  assert.strictEqual(queryKind('iPhone 15 Pro'), 'electronics');
  assert.strictEqual(queryKind('wireless earbuds'), 'electronics');
  assert.strictEqual(queryKind('Lawn Suit'), 'clothing');
  assert.strictEqual(queryKind('denim jeans'), 'clothing');
  assert.strictEqual(queryKind('panadol'), null); // unknown: ask every store
  assert.strictEqual(queryKind('phone and shirt'), null); // mixed: ask every store
  assert.strictEqual(queryKind('laptop bag'), null); // fashion stores sell these
  assert.strictEqual(queryKind('smart watch'), null);
  assert.strictEqual(queryKind('iphone case'), null);
});
