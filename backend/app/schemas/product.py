from datetime import datetime
from uuid import UUID

from app.schemas.common import ORMModel


class BrandBrief(ORMModel):
    id: UUID
    name: str
    slug: str


class CategoryBrief(ORMModel):
    id: UUID
    name: str
    slug: str


class ProductVariantRead(ORMModel):
    id: UUID
    product_id: UUID
    name: str
    sku: str | None
    barcode: str | None
    created_at: datetime
    updated_at: datetime


class ProductRead(ORMModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    image_url: str | None
    brand_id: UUID | None
    category_id: UUID | None
    created_at: datetime
    updated_at: datetime


class ProductDetail(ProductRead):
    brand: BrandBrief | None = None
    category: CategoryBrief | None = None
    variants: list[ProductVariantRead] = []
