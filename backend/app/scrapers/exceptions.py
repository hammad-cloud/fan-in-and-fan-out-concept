"""Scraper framework exceptions."""


class ScraperError(Exception):
    """Base error for all scraper failures."""

    def __init__(self, message: str, *, store_slug: str | None = None) -> None:
        self.store_slug = store_slug
        prefix = f"[{store_slug}] " if store_slug else ""
        super().__init__(f"{prefix}{message}")


class ScraperConfigError(ScraperError):
    """Invalid or missing scraper configuration."""


class ScraperFetchError(ScraperError):
    """Failed to fetch a remote page or resource."""


class ScraperParseError(ScraperError):
    """Failed to parse fetched content into structured data."""


class ScraperNotRegisteredError(ScraperError):
    """Requested store slug is not in the scraper registry."""
