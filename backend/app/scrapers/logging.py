"""Scraper-scoped logging helpers."""

from __future__ import annotations

import logging
from typing import Any


SCRAPER_LOGGER_NAME = "app.scrapers"


def get_scraper_logger(store_slug: str | None = None) -> logging.Logger:
    """Return a logger for the scraper framework or a specific store."""
    if store_slug:
        return logging.getLogger(f"{SCRAPER_LOGGER_NAME}.{store_slug}")
    return logging.getLogger(SCRAPER_LOGGER_NAME)


def configure_scraper_logging(level: int = logging.INFO) -> None:
    """Attach a basic stream handler if scraper logging is unconfigured."""
    logger = get_scraper_logger()
    if logger.handlers:
        logger.setLevel(level)
        return

    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s %(levelname)s [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    logger.addHandler(handler)
    logger.setLevel(level)
    logger.propagate = True


def log_scraper_event(
    store_slug: str,
    message: str,
    *,
    level: int = logging.INFO,
    **context: Any,
) -> None:
    """Log a structured event for a store scraper run."""
    logger = get_scraper_logger(store_slug)
    extra = {"store_slug": store_slug, **context}
    logger.log(level, message, extra=extra)
