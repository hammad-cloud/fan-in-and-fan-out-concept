from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.product import ProductDetail, ProductRead
from app.services.product import ProductService

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=PaginatedResponse[ProductRead])
async def list_products(
    brand_id: UUID | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[ProductRead]:
    products, total = await ProductService(db).list_products(
        brand_id=brand_id,
        category_id=category_id,
        limit=limit,
        offset=offset,
    )
    return PaginatedResponse(
        items=[ProductRead.model_validate(product) for product in products],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{product_id}", response_model=ProductDetail)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ProductDetail:
    product = await ProductService(db).get_product(product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return ProductDetail.model_validate(product)
