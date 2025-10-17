from fastapi import APIRouter

from ats.api.login import router as login_router
from ats.api.create_user import router as create_user_router

router = APIRouter(prefix="/api/v1/ats")
router.include_router(login_router)
router.include_router(create_user_router)

__all__ = [
    "router",
]
