from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.store import StoreRead
from app.services.store import StoreService

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("", response_model=PaginatedResponse[StoreRead])
async def list_stores(
    active_only: bool = Query(default=True),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[StoreRead]:
    stores, total = await StoreService(db).list_stores(
        active_only=active_only,
        limit=limit,
        offset=offset,
    )
    return PaginatedResponse(
        items=[StoreRead.model_validate(store) for store in stores],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{store_id}", response_model=StoreRead)
async def get_store(
    store_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> StoreRead:
    store = await StoreService(db).get_store(store_id)
    if store is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
    return StoreRead.model_validate(store)
