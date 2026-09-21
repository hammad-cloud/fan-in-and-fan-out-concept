from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Offer, Product, ProductVariant
from app.schemas.search import SearchResultItem
from app.schemas.product import ProductRead


class SearchService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def search_products(
        self,
        *,
        query: str,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[SearchResultItem], int]:
        pattern = f"%{query.strip()}%"
        filters = [
            or_(
                Product.name.ilike(pattern),
                Product.slug.ilike(pattern),
                Product.description.ilike(pattern),
            )
        ]

        total = await self.session.scalar(
            select(func.count()).select_from(Product).where(*filters)
        )

        products = list(
            (
                await self.session.scalars(
                    select(Product)
                    .where(*filters)
                    .order_by(Product.name.asc())
                    .limit(limit)
                    .offset(offset)
                )
            ).all()
        )

        if not products:
            return [], int(total or 0)

        product_ids = [product.id for product in products]
        stats_rows = await self.session.execute(
            select(
                ProductVariant.product_id,
                func.min(Offer.price),
                func.min(Offer.currency),
                func.count(Offer.id),
            )
            .join(Offer, Offer.product_variant_id == ProductVariant.id)
            .where(
                ProductVariant.product_id.in_(product_ids),
                Offer.is_active.is_(True),
            )
            .group_by(ProductVariant.product_id)
        )
        stats_by_product: dict[UUID, tuple[Decimal | None, str | None, int]] = {
            row[0]: (row[1], row[2], int(row[3])) for row in stats_rows.all()
        }

        items: list[SearchResultItem] = []
        for product in products:
            lowest, currency, offer_count = stats_by_product.get(
                product.id, (None, None, 0)
            )
            items.append(
                SearchResultItem(
                    product=ProductRead.model_validate(product),
                    lowest_price=lowest,
                    currency=currency,
                    offer_count=offer_count,
                )
            )

        return items, int(total or 0)
