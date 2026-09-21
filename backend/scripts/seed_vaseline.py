"""Add Vaseline demo products for local search testing."""

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

PRODUCTS = [
    {
        "name": "Vaseline Intensive Care Cocoa Glow Lotion 400ml",
        "slug": "vaseline-intensive-care-cocoa-glow-400ml",
        "price": Decimal("1149.00"),
        "store_slug": "daraz",
        "store_name": "Daraz",
        "website": "https://www.daraz.pk",
    },
    {
        "name": "Vaseline Lip Therapy Rosy Lips 20g",
        "slug": "vaseline-lip-therapy-rosy-lips-20g",
        "price": Decimal("690.00"),
        "store_slug": "priceoye",
        "store_name": "PriceOye",
        "website": "https://priceoye.pk",
    },
    {
        "name": "Vaseline Men Cooling Body Lotion 400ml",
        "slug": "vaseline-men-cooling-body-lotion-400ml",
        "price": Decimal("999.00"),
        "store_slug": "mega",
        "store_name": "Mega.pk",
        "website": "https://www.mega.pk",
    },
    {
        "name": "Vaseline Healthy Bright Gluta-Hya Serum Burst",
        "slug": "vaseline-healthy-bright-gluta-hya",
        "price": Decimal("1799.00"),
        "store_slug": "ishopping",
        "store_name": "iShopping",
        "website": "https://www.ishopping.pk",
    },
]


async def get_or_create_store(session, *, slug: str, name: str, website: str) -> Store:
    store = await session.scalar(select(Store).where(Store.slug == slug))
    if store:
        return store
    store = Store(name=name, slug=slug, website_url=website)
    session.add(store)
    await session.flush()
    return store


async def main() -> None:
    async with AsyncSessionLocal() as session:
        brand = await session.scalar(select(Brand).where(Brand.slug == "vaseline"))
        if brand is None:
            brand = Brand(name="Vaseline", slug="vaseline")
            session.add(brand)
            await session.flush()

        category = await session.scalar(select(Category).where(Category.slug == "personal-care"))
        if category is None:
            category = Category(name="Personal Care", slug="personal-care")
            session.add(category)
            await session.flush()

        created = 0
        for item in PRODUCTS:
            existing = await session.scalar(select(Product).where(Product.slug == item["slug"]))
            if existing is not None:
                continue

            store = await get_or_create_store(
                session,
                slug=item["store_slug"],
                name=item["store_name"],
                website=item["website"],
            )
            product = Product(
                name=item["name"],
                slug=item["slug"],
                description="Demo personal-care listing for nirphup search.",
                brand_id=brand.id,
                category_id=category.id,
            )
            session.add(product)
            await session.flush()

            variant = ProductVariant(
                product_id=product.id,
                name="Default",
                sku=item["slug"][:32],
            )
            session.add(variant)
            await session.flush()

            session.add(
                Offer(
                    store_id=store.id,
                    product_variant_id=variant.id,
                    price=item["price"],
                    product_url=f"{item['website'].rstrip('/')}/products/{item['slug']}",
                    availability=AvailabilityStatus.IN_STOCK,
                )
            )
            created += 1

        await session.commit()
        print(f"Vaseline seed complete. Created {created} products.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
