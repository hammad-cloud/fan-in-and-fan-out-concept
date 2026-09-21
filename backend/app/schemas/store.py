from datetime import datetime
from uuid import UUID

from app.schemas.common import ORMModel


class StoreRead(ORMModel):
    id: UUID
    name: str
    slug: str
    website_url: str
    logo_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
