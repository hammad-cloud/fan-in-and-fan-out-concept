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
