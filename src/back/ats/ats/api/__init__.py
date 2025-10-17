from fastapi import APIRouter

from ats.api.login import router as login_router
from ats.api.create_user import router as create_user_router
from ats.api.user_info import router as user_info_router
from ats.api.get_users import router as get_users_router

router = APIRouter(prefix="/api/v1/ats")
router.include_router(login_router)
router.include_router(create_user_router)
router.include_router(user_info_router)
router.include_router(get_users_router)

__all__ = [
    "router",
]
