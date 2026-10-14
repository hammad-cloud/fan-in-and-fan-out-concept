const test = require('node:test');
const assert = require('node:assert');
const { matchesQuery } = require('./relevance');

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
