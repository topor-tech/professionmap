from fastapi import APIRouter

from ats.api.auth.login import router as login_router
from ats.api.auth.create_user import router as create_user_router
from ats.api.auth.user_info import router as user_info_router
from ats.api.auth.get_users import router as get_users_router
from ats.api.hr.create_company import router as create_company_router
from ats.api.hr.get_companies import router as get_companies_router
from ats.api.hr.create_vacancy import router as create_vacancy_router
from ats.api.hr.get_vacancies import router as get_vacancies_router
from ats.api.hr.vacancy_stats import router as vacancy_stats_router
from ats.api.hr.comapny_suggest import router as company_suggest_router

router = APIRouter(prefix="/api/v1/ats")
router.include_router(login_router)
router.include_router(create_user_router)
router.include_router(user_info_router)
router.include_router(get_users_router)
router.include_router(create_company_router)
router.include_router(get_companies_router)
router.include_router(create_vacancy_router)
router.include_router(get_vacancies_router)
router.include_router(vacancy_stats_router)
router.include_router(company_suggest_router)
__all__ = [
    "router",
]
