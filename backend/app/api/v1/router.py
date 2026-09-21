from fastapi import APIRouter

from app.api.v1.endpoints import health, offers, products, search, stores

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(stores.router)
api_router.include_router(products.router)
api_router.include_router(offers.router)
api_router.include_router(search.router)
