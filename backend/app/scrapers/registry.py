"""Registry mapping store slugs to scraper classes."""

from __future__ import annotations

from typing import Any

from app.scrapers.base import BaseScraper
from app.scrapers.exceptions import ScraperConfigError, ScraperNotRegisteredError


class ScraperRegistry:
    """In-process registry of available store scrapers."""

    _scrapers: dict[str, type[BaseScraper]] = {}

    @classmethod
    def register(cls, scraper_cls: type[BaseScraper]) -> type[BaseScraper]:
        """Class decorator / helper to register a scraper implementation."""
        slug = getattr(scraper_cls, "store_slug", None)
        if not slug or not isinstance(slug, str):
            raise ScraperConfigError(
                f"{scraper_cls.__name__} must define a non-empty store_slug"
            )
        if not issubclass(scraper_cls, BaseScraper):
            raise ScraperConfigError(f"{scraper_cls.__name__} must subclass BaseScraper")

        existing = cls._scrapers.get(slug)
        if existing is not None and existing is not scraper_cls:
            raise ScraperConfigError(
                f"store_slug '{slug}' is already registered by {existing.__name__}",
                store_slug=slug,
            )

        cls._scrapers[slug] = scraper_cls
        return scraper_cls

    @classmethod
    def get(cls, store_slug: str) -> type[BaseScraper]:
        try:
            return cls._scrapers[store_slug]
        except KeyError as exc:
            raise ScraperNotRegisteredError(
                f"No scraper registered for store_slug '{store_slug}'",
                store_slug=store_slug,
            ) from exc

    @classmethod
    def create(cls, store_slug: str, **options: Any) -> BaseScraper:
        scraper_cls = cls.get(store_slug)
        return scraper_cls(**options)

    @classmethod
    def list_slugs(cls) -> list[str]:
        return sorted(cls._scrapers.keys())

    @classmethod
    def clear(cls) -> None:
        """Remove all registrations (intended for tests)."""
        cls._scrapers.clear()
