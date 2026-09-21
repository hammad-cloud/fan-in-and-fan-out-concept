"""Seed a small catalog dataset for local API testing."""

from __future__ import annotations

import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.db.session import AsyncSessionLocal, engine
from app.models import (
    AvailabilityStatus,
    Brand,
    Category,
    Offer,
    Product,
    ProductVariant,
    Store,
)


async def main() -> None:
    async with AsyncSessionLocal() as session:
        existing = await session.scalar(select(Store.id).limit(1))
        if existing is not None:
            print("Seed skipped — catalog data already present.")
            return

        store = Store(
            name="Daraz",
            slug="daraz",
            website_url="https://www.daraz.pk",
        )
        brand = Brand(name="Samsung", slug="samsung")
        category = Category(name="Mobiles", slug="mobiles")
        session.add_all([store, brand, category])
        await session.flush()

        product = Product(
            name="Samsung Galaxy A15",
            slug="samsung-galaxy-a15",
            description="Entry-level smartphone popular in Pakistan.",
            brand_id=brand.id,
            category_id=category.id,
        )
        session.add(product)
        await session.flush()

        variant = ProductVariant(
            product_id=product.id,
            name="8GB / 128GB",
            sku="A15-8-128",
        )
        session.add(variant)
        await session.flush()

        session.add(
            Offer(
                store_id=store.id,
                product_variant_id=variant.id,
                price=Decimal("54999.00"),
                product_url="https://www.daraz.pk/products/samsung-galaxy-a15",
                availability=AvailabilityStatus.IN_STOCK,
            )
        )
        await session.commit()
        print("Seed complete.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
