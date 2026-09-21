"""Unit tests for the CoreCommerce scraper (fixture-based)."""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import pytest

from app.scrapers import ScraperConfigError, ScraperRegistry
from app.scrapers.results import ScrapedAvailability
from app.scrapers.stores.corecommerce.parser import (
    parse_listing_page,
    parse_product_detail,
)
from app.scrapers.stores.corecommerce.scraper import CoreCommerceScraper

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "corecommerce"


@pytest.fixture(autouse=True)
def _register_corecommerce() -> None:
    # Import ensures @ScraperRegistry.register ran; clear + re-register for isolation.
    ScraperRegistry.clear()
    ScraperRegistry.register(CoreCommerceScraper)
    yield
    ScraperRegistry.clear()


def test_parse_product_detail_fixture() -> None:
    html = (FIXTURES / "product_detail.html").read_text(encoding="utf-8")
    item = parse_product_detail(
        html,
        page_url="https://www.guitareffectspedals.com/Keeley-Tube-Drive-Twin-Triode-Dual-Overdrive-p1466.html",
    )

    assert item.title == "Keeley Tube Drive Twin Triode Dual Overdrive"
    assert item.price == Decimal("399.00")
    assert item.currency == "USD"
    assert item.brand == "Keeley"
    assert item.sku == "1466"
    assert item.availability == ScrapedAvailability.IN_STOCK
    assert "16318.jpg" in str(item.image_url)
    assert str(item.url).endswith("-p1466.html")


def test_parse_search_listing_fixture() -> None:
    html = (FIXTURES / "search_results.html").read_text(encoding="utf-8")
    items = parse_listing_page(
        html,
        base_url="https://www.guitareffectspedals.com",
    )

    assert len(items) == 3
    assert items[0].title == "Boss SY-1 Synthesizer"
    assert items[0].price == Decimal("209.99")
    assert items[0].sku == "1148"
    assert items[0].availability == ScrapedAvailability.IN_STOCK
    assert items[2].availability == ScrapedAvailability.OUT_OF_STOCK


def test_registry_exposes_corecommerce() -> None:
    assert "corecommerce" in ScraperRegistry.list_slugs()
    scraper = ScraperRegistry.create(
        "corecommerce",
        base_url="https://www.guitareffectspedals.com",
        query="boss",
    )
    assert isinstance(scraper, CoreCommerceScraper)
    assert scraper.store_name == "CoreCommerce"
    assert "search_results" in scraper.build_search_url()


def test_requires_base_url_and_query() -> None:
    with pytest.raises(ScraperConfigError):
        CoreCommerceScraper(query="boss")
    with pytest.raises(ScraperConfigError):
        CoreCommerceScraper(base_url="https://www.guitareffectspedals.com")


@pytest.mark.asyncio
async def test_scrape_uses_listing_parser_without_network(monkeypatch: pytest.MonkeyPatch) -> None:
    html = (FIXTURES / "search_results.html").read_text(encoding="utf-8")

    async def _fake_get_text(_url: str) -> str:
        return html

    scraper = CoreCommerceScraper(
        base_url="https://www.guitareffectspedals.com",
        query="boss",
        max_items=2,
    )
    monkeypatch.setattr(scraper._client, "get_text", _fake_get_text)

    result = await scraper.scrape()
    assert result.success is True
    assert result.metadata["store"] == "CoreCommerce"
    assert result.item_count == 2
    assert result.items[0].title.startswith("Boss")
