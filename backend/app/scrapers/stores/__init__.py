"""CoreCommerce scraper package init — import to register store scrapers."""

from app.scrapers.stores import corecommerce as _corecommerce  # noqa: F401

__all__ = ["corecommerce"]
