from fastapi import APIRouter

from ats.api.login import router as login_router

router = APIRouter(prefix="/api/v1/ats")
router.include_router(login_router)

__all__ = [
    "router",
]
