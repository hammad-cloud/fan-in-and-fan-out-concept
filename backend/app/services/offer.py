from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Offer


class OfferService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_offers(
        self,
        *,
        store_id: UUID | None = None,
        product_variant_id: UUID | None = None,
        active_only: bool = True,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Offer], int]:
        filters = []
        if active_only:
            filters.append(Offer.is_active.is_(True))
        if store_id is not None:
            filters.append(Offer.store_id == store_id)
        if product_variant_id is not None:
            filters.append(Offer.product_variant_id == product_variant_id)

        count_stmt = select(func.count()).select_from(Offer)
        list_stmt = select(Offer).order_by(Offer.price.asc()).limit(limit).offset(offset)
        if filters:
            count_stmt = count_stmt.where(*filters)
            list_stmt = list_stmt.where(*filters)

        total = await self.session.scalar(count_stmt)
        result = await self.session.scalars(list_stmt)
        return list(result.all()), int(total or 0)

    async def get_offer(self, offer_id: UUID) -> Offer | None:
        result = await self.session.scalars(
            select(Offer)
            .where(Offer.id == offer_id)
            .options(selectinload(Offer.store))
        )
        return result.first()
