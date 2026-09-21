from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Product


class ProductService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_products(
        self,
        *,
        brand_id: UUID | None = None,
        category_id: UUID | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Product], int]:
        filters = []
        if brand_id is not None:
            filters.append(Product.brand_id == brand_id)
        if category_id is not None:
            filters.append(Product.category_id == category_id)

        count_stmt = select(func.count()).select_from(Product)
        list_stmt = select(Product).order_by(Product.name.asc()).limit(limit).offset(offset)
        if filters:
            count_stmt = count_stmt.where(*filters)
            list_stmt = list_stmt.where(*filters)

        total = await self.session.scalar(count_stmt)
        result = await self.session.scalars(list_stmt)
        return list(result.all()), int(total or 0)

    async def get_product(self, product_id: UUID) -> Product | None:
        result = await self.session.scalars(
            select(Product)
            .where(Product.id == product_id)
            .options(
                selectinload(Product.brand),
                selectinload(Product.category),
                selectinload(Product.variants),
            )
        )
        return result.first()
