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

// "iPhone" also matches cables, cases and stickers; flag those so they rank below the phones.
// shortcut: fixed word list, misses unlisted accessory words; upgrade to an embedding or LLM classifier if it leaks.
const ACCESSORY = /\b(cables?|chargers?|cases?|covers?|protectors?|tempered|stickers?|skins?|adapters?|straps?|holders?|stands?|mounts?|pouch(es)?)\b/;

// Not an accessory if the user asked for one ("iphone case").
const isAccessory = (title, query) => ACCESSORY.test(normalize(title)) && !ACCESSORY.test(normalize(query));

// Used to skip stores that can't carry the item: no point asking Khaadi for an iPhone.
// shortcut: fixed word lists; unlisted words (or both kinds in one query) fall back to querying every store.
const ELECTRONICS = /\b(phones?|iphones?|mobiles?|samsung|xiaomi|redmi|infinix|tecno|oppo|vivo|realme|laptops?|macbook|tablets?|ipad|earbuds?|airpods|headphones?|tvs?|monitors?|power ?banks?|speakers?|cameras?)\b/;
const CLOTHING = /\b(kurtas?|kurtis?|shirts?|t ?shirts?|lawn|suits?|dress(es)?|jeans|trousers?|shalwar|kameez|dupattas?|abayas?|jackets?|hoodies?|polos?|sarees?|unstitched|shawls?)\b/;

// Fashion stores carry laptop bags, phone pouches and watches, so those queries go to every store (npm run audit:routing).
const CARRIED_BY_BOTH = /\b(bags?|pouch(es)?|sleeves?|watch(es)?)\b/;

function queryKind(query) {
  const q = normalize(query);
  if (ACCESSORY.test(q) || CARRIED_BY_BOTH.test(q)) return null;
  const e = ELECTRONICS.test(q);
  const c = CLOTHING.test(q);
  return e === c ? null : e ? 'electronics' : 'clothing';
}

module.exports = { matchesQuery, isAccessory, queryKind };
