# CoreCommerce scraper

Scrapes **public** CoreCommerce merchant storefront HTML only.

## Inspected public endpoints

| Surface | Pattern |
| --- | --- |
| Search | `GET {base}/cart.php?m=search_results&headerSearch=Y&search={q}` |
| Listing cards | `.grid--product .grid__item` |
| Product detail | `#productDetail` + schema.org `Product` / `Offer` |
| Product id | `input[name=productID]` or URL `-p{id}.html` |

No CAPTCHA bypass, login, or anti-bot evasion is implemented. If a host
blocks plain HTTP clients, use saved fixtures for development/tests.

## Usage

```python
from app.scrapers import ScraperRegistry
import app.scrapers.stores.corecommerce  # registers scraper

scraper = ScraperRegistry.create(
    "corecommerce",
    base_url="https://example-store.example",
    query="boss",
    max_items=20,
)
result = await scraper.scrape()
```
