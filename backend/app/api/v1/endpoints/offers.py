from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.offer import OfferDetail, OfferRead
from app.services.offer import OfferService

router = APIRouter(prefix="/offers", tags=["offers"])


@router.get("", response_model=PaginatedResponse[OfferRead])
async def list_offers(
    store_id: UUID | None = Query(default=None),
    product_variant_id: UUID | None = Query(default=None),
    active_only: bool = Query(default=True),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[OfferRead]:
    offers, total = await OfferService(db).list_offers(
        store_id=store_id,
        product_variant_id=product_variant_id,
        active_only=active_only,
        limit=limit,
        offset=offset,
    )
    return PaginatedResponse(
        items=[OfferRead.model_validate(offer) for offer in offers],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{offer_id}", response_model=OfferDetail)
async def get_offer(
    offer_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> OfferDetail:
    offer = await OfferService(db).get_offer(offer_id)
    if offer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offer not found")
    return OfferDetail.model_validate(offer)
