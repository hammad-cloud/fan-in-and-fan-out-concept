// One adapter per store: search(query, signal) -> [{ title, price, originalPrice, image, url, available }]
// shortcut: these use each store's public search JSON/HTML, which can change without notice; update the adapter when a store breaks.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

async function get(url, signal, headers = {}) {
  const res = await fetch(url, { signal, headers: { 'User-Agent': UA, ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

const getJson = async (url, signal, headers) =>
  (await get(url, signal, { Accept: 'application/json', ...headers })).json();

const num = (v) => {
  const m = String(v ?? '').replace(/,/g, '').match(/\d+(\.\d+)?/); // "Rs. 21,300" -> 21300
  const n = m ? Number(m[0]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// Most stores here run on Shopify and share its predictive-search endpoint. all expose the same predictive-search endpoint.
async function shopifySearch(origin, q, signal) {
  const url = `${origin}/search/suggest.json?q=${encodeURIComponent(q)}&resources%5Btype%5D=product&resources%5Blimit%5D=10`;
  const data = await getJson(url, signal);
  return (data.resources?.results?.products ?? []).map((p) => {
    const price = num(p.price);
    const compare = num(p.compare_at_price_max);
    return {
      title: p.title,
      price,
      originalPrice: compare && compare > price ? compare : null,
      image: p.image || p.featured_image?.url,
      url: `${origin}${p.url?.split('?')[0] ?? ''}`,
      available: p.available !== false,
      keywords: [p.type, ...(p.tags ?? [])].join(' '), // e.g. Breakout titles say "denim" but tag "JEANS"
    };
  });
}

// PriceOye has no JSON search, so read the product cards from its server-rendered search page.
async function priceoyeSearch(q, signal) {
  const html = await (await get(`https://priceoye.pk/search?q=${encodeURIComponent(q)}`, signal)).text();
  return html
    .split('class="productBox b-productBox"')
    .slice(1)
    .map((box) => ({
      title: decode(box.match(/data-product-name="([^"]*)"/)?.[1] ?? ''),
      price: num(box.match(/class="price-box[^"]*">([\s\S]*?)<\/div>/)?.[1].replace(/<[^>]*>/g, '')),
      originalPrice: num(box.match(/class="price-diff-retail">([\s\S]*?)<\/div>/)?.[1].replace(/<[^>]*>/g, '')),
      image: box.match(/<amp-img src="([^"]+)"/)?.[1],
      url: box.match(/class="product-card[^"]*" href="([^"]+)"/)?.[1],
      available: null, // search cards carry no stock flag
    }));
}

// Salesforce Commerce Cloud stores (Khaadi, Sapphire) render standard SFRA product tiles on /search.
async function sfccSearch(origin, q, signal) {
  const html = await (await get(`${origin}/search?q=${encodeURIComponent(q)}`, signal)).text();
  const text = (s) => decode((s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
  return html
    .split('class="product-tile"')
    .slice(1)
    .map((tile) => {
      const href = tile.match(/class="pdp-link"[\s\S]*?href="([^"]+)"/)?.[1];
      const img = tile.match(/<img[^>]*tile-image[^>]*>/)?.[0] ?? '';
      return {
        title: text(tile.match(/class="pdp-link"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1]),
        price: num(tile.match(/class="sales[^"]*"[\s\S]*?content="([\d.]+)"/)?.[1]),
        originalPrice: num(tile.match(/class="strike-through[^"]*"[\s\S]*?content="([\d.]+)"/)?.[1]),
        image: decode(img.match(/(?:data-src|src)="(https?:[^"]+)"/)?.[1] ?? ''),
        url: href && new URL(href.split('?')[0], origin).href,
        available: null, // tiles carry no stock flag
      };
    });
}

// Laam is a marketplace with its own JSON API; it answers only requests that look like they come from laam.com.
async function laamSearch(q, signal) {
  const data = await getJson(`https://gateway.laam.pk/v1/products/search?query=${encodeURIComponent(q)}&limit=24`, signal, {
    Origin: 'https://laam.com',
  });
  return (data.products ?? []).map((p) => {
    const variants = Array.isArray(p.variants) ? p.variants : [];
    const cheapest = variants.reduce((best, v) => (!best || num(v.price) < num(best.price) ? v : best), null);
    const price = num(cheapest?.price);
    const compare = num(cheapest?.compare_at_price);
    return {
      title: p.brand ? `${p.brand} – ${p.title}` : p.title,
      price,
      originalPrice: compare && compare > price ? compare : null,
      image: p.image?.src,
      url: `https://laam.com/products/${p.handle}`,
      available: p.total_inventory_quantity > 0,
    };
  });
}

// Dvago (pharmacy) exposes its search-box API as JSON.
async function dvagoSearch(q, signal) {
  const data = await getJson(
    `https://apidb.dvago.pk/AppAPIV3/SearchinginBox&ProductName=${encodeURIComponent(q)}&limit=0,20&BranchCode=`,
    signal
  );
  const products = (data.Data ?? []).find((g) => g.Type === 'Product')?.Data ?? [];
  return products.map((p) => {
    const sale = num(p.SalePrice);
    const discounted = num(p.DiscountPrice);
    const price = discounted && discounted < sale ? discounted : sale;
    return {
      title: (p.Title ?? '').trim().replace(/\b\w/g, (c) => c.toUpperCase()), // API returns lowercase titles
      price,
      originalPrice: sale > price ? sale : null,
      image: p.ImageURL,
      url: `https://www.dvago.pk/p/${p.Slug}`,
      available: Number(p.AvailableQty) > 0,
    };
  });
}

// Magento 2 stores (Shophive) expose the standard GraphQL product search.
async function magentoSearch(origin, q, signal) {
  const query = `{products(search:${JSON.stringify(q)},pageSize:20){items{name url_key url_suffix stock_status small_image{url} price_range{minimum_price{regular_price{value} final_price{value}}}}}}`;
  const data = await getJson(`${origin}/graphql?query=${encodeURIComponent(query)}`, signal);
  return (data.data?.products?.items ?? []).map((p) => {
    const price = num(p.price_range?.minimum_price?.final_price?.value);
    const regular = num(p.price_range?.minimum_price?.regular_price?.value);
    return {
      title: p.name,
      price,
      originalPrice: regular > price ? regular : null,
      image: p.small_image?.url,
      url: `${origin}/${p.url_key}${p.url_suffix ?? '.html'}`,
      available: p.stock_status === 'IN_STOCK',
    };
  });
}

const magento = (id, name, origin) => ({ id, name, site: origin, search: (q, signal) => magentoSearch(origin, q, signal) });
const shopify = (id, name, origin) => ({ id, name, site: origin, search: (q, signal) => shopifySearch(origin, q, signal) });
const sfcc = (id, name, origin) => ({ id, name, site: origin, search: (q, signal) => sfccSearch(origin, q, signal) });

const stores = [
  {
    id: 'daraz',
    name: 'Daraz',
    site: 'https://www.daraz.pk',
    async search(q, signal) {
      const data = await getJson(`https://www.daraz.pk/catalog/?ajax=true&q=${encodeURIComponent(q)}`, signal);
      return (data.mods?.listItems ?? []).map((it) => ({
        title: it.name,
        price: num(it.price),
        originalPrice: num(it.originalPrice),
        image: it.image,
        url: it.itemUrl?.startsWith('//') ? `https:${it.itemUrl}` : it.itemUrl,
        available: it.inStock !== false,
        rating: num(it.ratingScore),
      }));
    },
  },
  {
    id: 'alfatah',
    name: 'Al-Fatah',
    site: 'https://alfatah.pk',
    search: (q, signal) => shopifySearch('https://alfatah.pk', q, signal),
  },
  {
    id: 'priceoye',
    name: 'PriceOye',
    site: 'https://priceoye.pk',
    search: priceoyeSearch,
  },
  {
    id: 'junaidjamshed',
    name: 'J.',
    site: 'https://www.junaidjamshed.com',
    search: (q, signal) => shopifySearch('https://www.junaidjamshed.com', q, signal),
  },
  {
    id: 'mariab',
    name: 'Maria B',
    site: 'https://www.mariab.pk',
    search: (q, signal) => shopifySearch('https://www.mariab.pk', q, signal),
  },
  {
    id: 'jenpharm',
    name: 'Jenpharm',
    site: 'https://jenpharm.com',
    search: (q, signal) => shopifySearch('https://jenpharm.com', q, signal),
  },
  sfcc('khaadi', 'Khaadi', 'https://pk.khaadi.com'),
  sfcc('sapphire', 'Sapphire', 'https://pk.sapphireonline.pk'),
  shopify('gulahmed', 'Gul Ahmed', 'https://www.gulahmedshop.com'),
  shopify('ethnic', 'Ethnic', 'https://pk.ethnc.com'),
  shopify('saya', 'Saya', 'https://saya.pk'),
  shopify('almirah', 'Almirah', 'https://almirah.com.pk'),
  shopify('highfy', 'Highfy', 'https://highfy.pk'),
  shopify('telemart', 'Telemart', 'https://telemart.pk'),
  shopify('sanasafinaz', 'Sana Safinaz', 'https://www.sanasafinaz.com'),
  { id: 'dvago', name: 'Dvago', site: 'https://www.dvago.pk', search: dvagoSearch },
  magento('shophive', 'Shophive', 'https://www.shophive.com'),
  // Fashion
  shopify('alkaram', 'Alkaram', 'https://alkaramstudio.com'),
  shopify('limelight', 'Limelight', 'https://limelight.pk'),
  shopify('bonanza', 'Bonanza Satrangi', 'https://bonanzasatrangi.com'),
  shopify('beechtree', 'Beechtree', 'https://beechtree.pk'),
  shopify('generation', 'Generation', 'https://generation.com.pk'),
  shopify('edenrobe', 'Edenrobe', 'https://edenrobe.com'),
  shopify('crossstitch', 'Cross Stitch', 'https://crossstitch.pk'),
  shopify('zellbury', 'Zellbury', 'https://zellbury.com'),
  shopify('outfitters', 'Outfitters', 'https://outfitters.com.pk'),
  shopify('cambridge', 'Cambridge', 'https://thecambridgeshop.com'),
  shopify('diners', 'Diners', 'https://diners.com.pk'),
  shopify('breakout', 'Breakout', 'https://breakout.com.pk'),
  // Footwear & accessories
  shopify('bata', 'Bata', 'https://bata.com.pk'),
  shopify('servis', 'Servis', 'https://servis.pk'),
  shopify('ndure', 'Ndure', 'https://ndure.com'),
  shopify('borjan', 'Borjan', 'https://borjan.com.pk'),
  shopify('hushpuppies', 'Hush Puppies', 'https://hushpuppies.com.pk'),
  shopify('stylo', 'Stylo', 'https://stylo.pk'),
  shopify('bagallery', 'Bagallery', 'https://bagallery.com'),
  // Home & furniture
  shopify('chenone', 'ChenOne', 'https://chenone.com'),
  shopify('interwood', 'Interwood', 'https://interwood.pk'),
  shopify('habitt', 'Habitt', 'https://habitt.com'),
  { id: 'laam', name: 'Laam', site: 'https://laam.com', search: laamSearch },
  {
    id: 'naheed',
    name: 'Naheed',
    site: 'https://www.naheed.pk',
    async search(q, signal) {
      const data = await getJson(
        `https://www.naheed.pk/searchautocomplete/ajax/suggest/?q=${encodeURIComponent(q)}`,
        signal,
        { 'X-Requested-With': 'XMLHttpRequest' }
      );
      const products = data.indexes?.find((i) => i.identifier === 'magento_catalog_product');
      return (products?.items ?? []).map((p) => ({
        title: decode(p.name ?? ''),
        price: num(p.price),
        originalPrice: null,
        image: p.imageUrl,
        url: p.url,
        available: null, // the autocomplete feed has no reliable stock flag
      }));
    },
  },
];

// Category shown in the store directory on the homepage.
const CATEGORY = {
  'Marketplaces & Electronics': ['daraz', 'priceoye', 'telemart', 'shophive'],
  'Grocery & Supermarkets': ['alfatah', 'naheed'],
  Fashion: [
    'khaadi', 'sapphire', 'gulahmed', 'mariab', 'sanasafinaz', 'junaidjamshed', 'alkaram', 'limelight', 'bonanza',
    'beechtree', 'generation', 'edenrobe', 'crossstitch', 'zellbury', 'ethnic', 'saya', 'almirah', 'outfitters',
    'cambridge', 'diners', 'breakout', 'laam',
  ],
  'Footwear & Bags': ['bata', 'servis', 'ndure', 'borjan', 'hushpuppies', 'stylo', 'bagallery'],
  'Beauty & Pharmacy': ['jenpharm', 'highfy', 'dvago'],
  'Home & Furniture': ['chenone', 'interwood', 'habitt'],
};
for (const [category, ids] of Object.entries(CATEGORY)) {
  for (const id of ids) stores.find((s) => s.id === id).category = category; // throws on a typo'd id
}

module.exports = { stores };
