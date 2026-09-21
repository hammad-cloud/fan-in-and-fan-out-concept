"""Generic store scraper framework.

Concrete store scrapers live in submodules and register themselves with
``ScraperRegistry``. No retailer implementations ship in this package yet.
"""

from app.scrapers.base import BaseScraper
from app.scrapers.exceptions import (
    ScraperConfigError,
    ScraperError,
    ScraperFetchError,
    ScraperNotRegisteredError,
    ScraperParseError,
)
from app.scrapers.logging import configure_scraper_logging, get_scraper_logger, log_scraper_event
from app.scrapers.registry import ScraperRegistry
from app.scrapers.results import ScrapedAvailability, ScrapedItem, ScraperResult

__all__ = [
    "BaseScraper",
    "ScrapedAvailability",
    "ScrapedItem",
    "ScraperConfigError",
    "ScraperError",
    "ScraperFetchError",
    "ScraperNotRegisteredError",
    "ScraperParseError",
    "ScraperRegistry",
    "ScraperResult",
    "configure_scraper_logging",
    "get_scraper_logger",
    "log_scraper_event",
]
