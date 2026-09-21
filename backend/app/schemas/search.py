from decimal import Decimal

from app.schemas.common import ORMModel
from app.schemas.product import ProductRead


class SearchResultItem(ORMModel):
    product: ProductRead
    lowest_price: Decimal | None = None
    currency: str | None = None
    offer_count: int = 0
