"""Structured outputs produced by store scrapers."""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl, field_validator


class ScrapedAvailability(str, Enum):
    IN_STOCK = "in_stock"
    OUT_OF_STOCK = "out_of_stock"
    UNKNOWN = "unknown"


class ScrapedItem(BaseModel):
    """One product/offer candidate returned by a store scraper."""

    title: str = Field(min_length=1, max_length=512)
    price: Decimal = Field(ge=0)
    currency: str = Field(default="PKR", min_length=3, max_length=3)
    url: HttpUrl
    availability: ScrapedAvailability = ScrapedAvailability.UNKNOWN
    sku: str | None = None
    barcode: str | None = None
    image_url: HttpUrl | None = None
    brand: str | None = None
    category: str | None = None
    raw: dict[str, Any] = Field(default_factory=dict)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class ScraperResult(BaseModel):
    """Normalized result envelope for any store scraper run."""

    store_slug: str = Field(min_length=1, max_length=255)
    success: bool
    items: list[ScrapedItem] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    started_at: datetime
    finished_at: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)

    @classmethod
    def empty_success(cls, store_slug: str) -> "ScraperResult":
        now = datetime.now(timezone.utc)
        return cls(
            store_slug=store_slug,
            success=True,
            items=[],
            errors=[],
            started_at=now,
            finished_at=now,
        )

    @classmethod
    def from_failure(
        cls,
        store_slug: str,
        *,
        error: str,
        started_at: datetime | None = None,
    ) -> "ScraperResult":
        now = datetime.now(timezone.utc)
        return cls(
            store_slug=store_slug,
            success=False,
            items=[],
            errors=[error],
            started_at=started_at or now,
            finished_at=now,
        )

    @property
    def item_count(self) -> int:
        return len(self.items)
