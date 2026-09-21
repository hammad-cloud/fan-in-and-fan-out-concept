"""Abstract base for all store scrapers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, ClassVar

from app.scrapers.exceptions import ScraperConfigError
from app.scrapers.logging import get_scraper_logger, log_scraper_event
from app.scrapers.results import ScraperResult


class BaseScraper(ABC):
    """Contract every store scraper must implement.

    Concrete scrapers register with the scraper registry and expose a unique
    ``store_slug``. Fetching, parsing, and anti-bot concerns belong in subclasses
    (anti-bot / CAPTCHA handling is intentionally out of scope for this layer).
    """

    store_slug: ClassVar[str]
    store_name: ClassVar[str]

    def __init__(self, **options: Any) -> None:
        self.options = options
        slug = getattr(type(self), "store_slug", None)
        self.logger = get_scraper_logger(slug if isinstance(slug, str) else None)
        self.validate_config()

    def validate_config(self) -> None:
        """Validate class-level identity. Override to check runtime options."""
        if not getattr(self, "store_slug", None):
            raise ScraperConfigError("store_slug is required on scraper classes")
        if not getattr(self, "store_name", None):
            raise ScraperConfigError(
                "store_name is required on scraper classes",
                store_slug=self.store_slug,
            )

    @abstractmethod
    async def scrape(self) -> ScraperResult:
        """Run the scraper and return a normalized result."""

    async def run(self) -> ScraperResult:
        """Execute ``scrape`` with timing and standard logging."""
        started_at = datetime.now(timezone.utc)
        log_scraper_event(self.store_slug, "scrape_started", started_at=started_at.isoformat())

        try:
            result = await self.scrape()
        except Exception as exc:  # noqa: BLE001 — converted to result envelope
            self.logger.exception("scrape_failed")
            return ScraperResult.from_failure(
                self.store_slug,
                error=str(exc),
                started_at=started_at,
            )

        # Preserve scraper-provided start time when present; otherwise stamp run().
        if result.started_at.tzinfo is None:
            result = result.model_copy(update={"started_at": started_at})
        result = result.model_copy(update={"finished_at": datetime.now(timezone.utc)})

        log_scraper_event(
            self.store_slug,
            "scrape_finished",
            success=result.success,
            item_count=result.item_count,
            error_count=len(result.errors),
        )
        return result
