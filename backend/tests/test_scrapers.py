"""Unit tests for the generic scraper framework."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.scrapers import (
    BaseScraper,
    ScrapedAvailability,
    ScrapedItem,
    ScraperConfigError,
    ScraperError,
    ScraperFetchError,
    ScraperNotRegisteredError,
    ScraperParseError,
    ScraperRegistry,
    ScraperResult,
    configure_scraper_logging,
    get_scraper_logger,
)
from app.scrapers.logging import log_scraper_event


@pytest.fixture(autouse=True)
def _clear_registry() -> None:
    ScraperRegistry.clear()
    yield
    ScraperRegistry.clear()


class _StubScraper(BaseScraper):
    store_slug = "stub-store"
    store_name = "Stub Store"

    async def scrape(self) -> ScraperResult:
        now = datetime.now(timezone.utc)
        return ScraperResult(
            store_slug=self.store_slug,
            success=True,
            items=[
                ScrapedItem(
                    title="Test Phone",
                    price=Decimal("1000.00"),
                    currency="pkr",
                    url="https://example.com/products/test-phone",
                    availability=ScrapedAvailability.IN_STOCK,
                )
            ],
            started_at=now,
            finished_at=now,
        )


class _BrokenScraper(BaseScraper):
    store_slug = "broken-store"
    store_name = "Broken Store"

    async def scrape(self) -> ScraperResult:
        raise ScraperFetchError("network down", store_slug=self.store_slug)


def test_base_scraper_cannot_be_instantiated() -> None:
    with pytest.raises(TypeError):
        BaseScraper()  # type: ignore[abstract]


def test_scraper_requires_identity() -> None:
    class Incomplete(BaseScraper):
        async def scrape(self) -> ScraperResult:
            return ScraperResult.empty_success("x")

    with pytest.raises(ScraperConfigError):
        Incomplete()  # type: ignore[abstract]


@pytest.mark.asyncio
async def test_stub_scraper_implements_interface() -> None:
    scraper = _StubScraper()
    result = await scraper.scrape()

    assert result.success is True
    assert result.store_slug == "stub-store"
    assert result.item_count == 1
    assert result.items[0].currency == "PKR"
    assert result.items[0].price == Decimal("1000.00")


@pytest.mark.asyncio
async def test_run_wraps_exceptions_into_failure_result() -> None:
    scraper = _BrokenScraper()
    result = await scraper.run()

    assert result.success is False
    assert result.item_count == 0
    assert result.errors
    assert "network down" in result.errors[0]


def test_registry_register_get_create_and_list() -> None:
    ScraperRegistry.register(_StubScraper)

    assert ScraperRegistry.list_slugs() == ["stub-store"]
    assert ScraperRegistry.get("stub-store") is _StubScraper

    instance = ScraperRegistry.create("stub-store", timeout=5)
    assert isinstance(instance, _StubScraper)
    assert instance.options["timeout"] == 5


def test_registry_unknown_slug_raises() -> None:
    with pytest.raises(ScraperNotRegisteredError):
        ScraperRegistry.get("missing-store")


def test_registry_rejects_duplicate_slug() -> None:
    ScraperRegistry.register(_StubScraper)

    class Duplicate(_StubScraper):
        store_name = "Duplicate"

    with pytest.raises(ScraperConfigError):
        ScraperRegistry.register(Duplicate)


def test_registry_decorator_style() -> None:
    @ScraperRegistry.register
    class Decorated(BaseScraper):
        store_slug = "decorated"
        store_name = "Decorated"

        async def scrape(self) -> ScraperResult:
            return ScraperResult.empty_success(self.store_slug)

    assert "decorated" in ScraperRegistry.list_slugs()


def test_exception_hierarchy() -> None:
    assert issubclass(ScraperFetchError, ScraperError)
    assert issubclass(ScraperParseError, ScraperError)
    assert issubclass(ScraperConfigError, ScraperError)
    assert issubclass(ScraperNotRegisteredError, ScraperError)

    err = ScraperFetchError("boom", store_slug="daraz")
    assert err.store_slug == "daraz"
    assert "[daraz]" in str(err)


def test_result_helpers() -> None:
    ok = ScraperResult.empty_success("demo")
    assert ok.success is True
    assert ok.item_count == 0

    bad = ScraperResult.from_failure("demo", error="parse failed")
    assert bad.success is False
    assert bad.errors == ["parse failed"]


def test_scraped_item_rejects_negative_price() -> None:
    with pytest.raises(Exception):
        ScrapedItem(
            title="Bad",
            price=Decimal("-1.00"),
            url="https://example.com/item",
        )


def test_scraper_logging_helpers(caplog: pytest.LogCaptureFixture) -> None:
    configure_scraper_logging()
    logger = get_scraper_logger("stub-store")
    assert logger.name.endswith("stub-store")

    with caplog.at_level("INFO", logger="app.scrapers"):
        log_scraper_event("stub-store", "unit_test_event", foo="bar")

    assert any("unit_test_event" in record.message for record in caplog.records)
