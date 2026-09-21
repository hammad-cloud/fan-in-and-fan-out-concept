from urllib.parse import quote_plus, urljoin

import httpx

from app.scrapers.exceptions import ScraperFetchError

DEFAULT_HEADERS = {
    "User-Agent": "PriceComparisonPK/0.1 (+https://localhost; research scraper)",
    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
}


class CoreCommerceClient:
    """Minimal HTTP client for publicly reachable CoreCommerce pages."""

    def __init__(
        self,
        base_url: str,
        *,
        timeout: float = 20.0,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.headers = {**DEFAULT_HEADERS, **(headers or {})}

    def build_search_url(self, query: str) -> str:
        return (
            f"{self.base_url}/cart.php"
            f"?m=search_results&headerSearch=Y&search={quote_plus(query)}"
        )

    async def get_text(self, url: str) -> str:
        absolute = url if url.startswith("http") else urljoin(self.base_url + "/", url)
        try:
            async with httpx.AsyncClient(
                headers=self.headers,
                timeout=self.timeout,
                follow_redirects=True,
            ) as client:
                response = await client.get(absolute)
        except httpx.HTTPError as exc:
            raise ScraperFetchError(
                f"Failed to fetch {absolute}: {exc}",
                store_slug="corecommerce",
            ) from exc

        if response.status_code >= 400:
            raise ScraperFetchError(
                f"HTTP {response.status_code} for {absolute}",
                store_slug="corecommerce",
            )

        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type and "application/xhtml" not in content_type:
            body_prefix = response.text.lstrip()[:15].lower()
            if not (body_prefix.startswith("<!doctype") or body_prefix.startswith("<html")):
                raise ScraperFetchError(
                    f"Unexpected content-type '{content_type}' for {absolute}",
                    store_slug="corecommerce",
                )

        return response.text
