import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import TimestampMixin


class AvailabilityStatus(str, enum.Enum):
    IN_STOCK = "in_stock"
    OUT_OF_STOCK = "out_of_stock"
    UNKNOWN = "unknown"


class ScrapeRunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class Store(TimestampMixin, Base):
    __tablename__ = "stores"
    __table_args__ = (
        Index("ix_stores_is_active", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    website_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(String(2048))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))

    offers: Mapped[list["Offer"]] = relationship(
        back_populates="store",
        passive_deletes=True,
    )
    scrape_runs: Mapped[list["ScrapeRun"]] = relationship(
        back_populates="store",
        passive_deletes=True,
    )


class Brand(TimestampMixin, Base):
    __tablename__ = "brands"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    products: Mapped[list["Product"]] = relationship(back_populates="brand")


class Category(TimestampMixin, Base):
    __tablename__ = "categories"
    __table_args__ = (
        Index("ix_categories_parent_id", "parent_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
    )

    parent: Mapped[Optional["Category"]] = relationship(
        remote_side="Category.id",
        back_populates="children",
    )
    children: Mapped[list["Category"]] = relationship(back_populates="parent")
    products: Mapped[list["Product"]] = relationship(back_populates="category")


class Product(TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        Index("ix_products_brand_id", "brand_id"),
        Index("ix_products_category_id", "category_id"),
        Index("ix_products_name", "name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    slug: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    image_url: Mapped[Optional[str]] = mapped_column(String(2048))
    brand_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("brands.id", ondelete="SET NULL"),
    )
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id", ondelete="SET NULL"),
    )

    brand: Mapped[Optional["Brand"]] = relationship(back_populates="products")
    category: Mapped[Optional["Category"]] = relationship(back_populates="products")
    variants: Mapped[list["ProductVariant"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
    )


class ProductVariant(TimestampMixin, Base):
    __tablename__ = "product_variants"
    __table_args__ = (
        UniqueConstraint("product_id", "sku", name="uq_product_variants_product_sku"),
        Index("ix_product_variants_product_id", "product_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    sku: Mapped[Optional[str]] = mapped_column(String(128))
    barcode: Mapped[Optional[str]] = mapped_column(String(64), index=True)

    product: Mapped["Product"] = relationship(back_populates="variants")
    offers: Mapped[list["Offer"]] = relationship(
        back_populates="product_variant",
        cascade="all, delete-orphan",
    )


class Offer(TimestampMixin, Base):
    __tablename__ = "offers"
    __table_args__ = (
        UniqueConstraint(
            "store_id",
            "product_variant_id",
            name="uq_offers_store_variant",
        ),
        CheckConstraint("price >= 0", name="ck_offers_price_non_negative"),
        Index("ix_offers_store_id", "store_id"),
        Index("ix_offers_product_variant_id", "product_variant_id"),
        Index("ix_offers_price", "price"),
        Index("ix_offers_is_active", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    store_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stores.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("product_variants.id", ondelete="CASCADE"),
        nullable=False,
    )
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default=text("'PKR'"))
    product_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    availability: Mapped[AvailabilityStatus] = mapped_column(
        Enum(
            AvailabilityStatus,
            name="availability_status",
            native_enum=True,
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        server_default=text("'unknown'"),
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    store: Mapped["Store"] = relationship(back_populates="offers")
    product_variant: Mapped["ProductVariant"] = relationship(back_populates="offers")
    price_history: Mapped[list["PriceHistory"]] = relationship(
        back_populates="offer",
        cascade="all, delete-orphan",
    )


class ScrapeRun(TimestampMixin, Base):
    __tablename__ = "scrape_runs"
    __table_args__ = (
        Index("ix_scrape_runs_store_id", "store_id"),
        Index("ix_scrape_runs_status", "status"),
        Index("ix_scrape_runs_started_at", "started_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    store_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stores.id", ondelete="SET NULL"),
    )
    status: Mapped[ScrapeRunStatus] = mapped_column(
        Enum(
            ScrapeRunStatus,
            name="scrape_run_status",
            native_enum=True,
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
        server_default=text("'pending'"),
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    items_found: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    error_message: Mapped[Optional[str]] = mapped_column(Text)

    store: Mapped[Optional["Store"]] = relationship(back_populates="scrape_runs")
    price_history: Mapped[list["PriceHistory"]] = relationship(back_populates="scrape_run")


class PriceHistory(Base):
    """Append-only price snapshots. No updated_at — rows are immutable facts."""

    __tablename__ = "price_history"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_price_history_price_non_negative"),
        Index("ix_price_history_offer_recorded", "offer_id", "recorded_at"),
        Index("ix_price_history_scrape_run_id", "scrape_run_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    offer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("offers.id", ondelete="CASCADE"),
        nullable=False,
    )
    scrape_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("scrape_runs.id", ondelete="SET NULL"),
    )
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default=text("'PKR'"))
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    offer: Mapped["Offer"] = relationship(back_populates="price_history")
    scrape_run: Mapped[Optional["ScrapeRun"]] = relationship(back_populates="price_history")
