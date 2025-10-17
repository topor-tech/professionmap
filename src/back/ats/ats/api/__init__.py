from fastapi import APIRouter

from ats.api.auth.login import router as login_router
from ats.api.auth.create_user import router as create_user_router
from ats.api.auth.user_info import router as user_info_router
from ats.api.auth.get_users import router as get_users_router
from ats.api.hr.create_company import router as create_company_router
from ats.api.hr.get_companies import router as get_companies_router

router = APIRouter(prefix="/api/v1/ats")
router.include_router(login_router)
router.include_router(create_user_router)
router.include_router(user_info_router)
router.include_router(get_users_router)
router.include_router(create_company_router)
router.include_router(get_companies_router)

__all__ = [
    "router",
]
