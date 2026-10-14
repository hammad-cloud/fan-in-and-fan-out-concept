// Some stores (Shopify predictive search especially) return loose matches, e.g. lawn suits for "earbuds".
// Keep a result only if its title contains every word of the query.

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function matchesQuery(title, query) {
  const t = normalize(title);
  const joined = t.replace(/ /g, ''); // "smart watch" should match "Smartwatch"
  const words = normalize(query).split(' ').filter(Boolean);
  return words.every((w) => {
    const stem = w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w; // "earbuds" matches "earbud"
    return t.includes(stem) || joined.includes(stem);
  });
}

module.exports = { matchesQuery };
