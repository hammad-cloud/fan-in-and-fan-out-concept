from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Store


class StoreService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_stores(
        self,
        *,
        active_only: bool = True,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Store], int]:
        filters = [Store.is_active.is_(True)] if active_only else []

        count_stmt = select(func.count()).select_from(Store)
        list_stmt = select(Store).order_by(Store.name.asc()).limit(limit).offset(offset)
        if filters:
            count_stmt = count_stmt.where(*filters)
            list_stmt = list_stmt.where(*filters)

        total = await self.session.scalar(count_stmt)
        result = await self.session.scalars(list_stmt)
        return list(result.all()), int(total or 0)

    async def get_store(self, store_id: UUID) -> Store | None:
        return await self.session.get(Store, store_id)
