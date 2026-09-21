from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.models.catalog import AvailabilityStatus
from app.schemas.common import ORMModel
from app.schemas.store import StoreRead


class OfferRead(ORMModel):
    id: UUID
    store_id: UUID
    product_variant_id: UUID
    price: Decimal
    currency: str
    product_url: str
    availability: AvailabilityStatus
    is_active: bool
    last_seen_at: datetime | None
    created_at: datetime
    updated_at: datetime


class OfferDetail(OfferRead):
    store: StoreRead | None = None
