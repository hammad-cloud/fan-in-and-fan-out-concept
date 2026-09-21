"""CoreCommerce storefront scraper (public HTML only)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, ClassVar
from urllib.parse import quote_plus, urljoin

from app.scrapers.base import BaseScraper
from app.scrapers.exceptions import ScraperConfigError, ScraperParseError
from app.scrapers.registry import ScraperRegistry
from app.scrapers.results import ScrapedItem, ScraperResult
from app.scrapers.stores.corecommerce.client import CoreCommerceClient
from app.scrapers.stores.corecommerce.parser import parse_listing_page, parse_product_detail


@ScraperRegistry.register
class CoreCommerceScraper(BaseScraper):
    """Scrape publicly visible CoreCommerce merchant storefronts.

    Inspected public surface (no login / CAPTCHA bypass):
    - Search: ``GET /cart.php?m=search_results&headerSearch=Y&search=...``
    - Listing cards: ``.grid--product .grid__item``
    - Product detail: ``#productDetail`` + schema.org Product/Offer microdata
    - Product id: ``input[name=productID]`` or URL suffix ``-p{id}.html``
    """

    store_slug: ClassVar[str] = "corecommerce"
    store_name: ClassVar[str] = "CoreCommerce"

    def __init__(self, **options: Any) -> None:
        super().__init__(**options)
        self.base_url = str(self.options.get("base_url") or "").rstrip("/")
        self.query = str(self.options.get("query") or "").strip()
        self.max_items = int(self.options.get("max_items") or 20)
        self.enrich_details = bool(self.options.get("enrich_details", False))
        self.timeout = float(self.options.get("timeout") or 20.0)
        self._client = CoreCommerceClient(self.base_url, timeout=self.timeout)

    def validate_config(self) -> None:
        super().validate_config()
        base_url = str(self.options.get("base_url") or "").rstrip("/")
        if not base_url.startswith(("http://", "https://")):
            raise ScraperConfigError(
                "base_url is required and must be an absolute http(s) URL",
                store_slug=self.store_slug,
            )
        query = str(self.options.get("query") or "").strip()
        if not query:
            raise ScraperConfigError(
                "query is required for CoreCommerce search scraping",
                store_slug=self.store_slug,
            )

    def build_search_url(self, query: str | None = None) -> str:
        q = quote_plus(query or self.query)
        return f"{self.base_url}/cart.php?m=search_results&headerSearch=Y&search={q}"

    async def scrape(self) -> ScraperResult:
        started = datetime.now(timezone.utc)
        search_url = self.build_search_url()
        html = await self._client.get_text(search_url)

        try:
            items = parse_listing_page(html, base_url=self.base_url)
        except Exception as exc:  # noqa: BLE001
            raise ScraperParseError(str(exc), store_slug=self.store_slug) from exc

        items = items[: self.max_items]
        errors: list[str] = []

        if self.enrich_details:
            enriched: list[ScrapedItem] = []
            for item in items:
                try:
                    detail_html = await self._client.get_text(str(item.url))
                    detail = parse_product_detail(detail_html, page_url=str(item.url))
                    enriched.append(detail)
                except Exception as exc:  # noqa: BLE001 — keep listing row
                    errors.append(f"{item.url}: {exc}")
                    enriched.append(item)
            items = enriched

        return ScraperResult(
            store_slug=self.store_slug,
            success=True,
            items=items,
            errors=errors,
            started_at=started,
            finished_at=datetime.now(timezone.utc),
            metadata={
                "store": self.store_name,
                "base_url": self.base_url,
                "query": self.query,
                "search_url": search_url,
                "item_count": len(items),
            },
        )

    async def scrape_product(self, product_url: str) -> ScrapedItem:
        """Fetch and parse a single public product detail page."""
        absolute = (
            product_url
            if product_url.startswith("http")
            else urljoin(self.base_url + "/", product_url)
        )
        html = await self._client.get_text(absolute)
        return parse_product_detail(html, page_url=absolute)
