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
from ats.api.auth.hr_user_suggest import router as hr_user_suggest_router
from ats.api.hr.add_user_to_company import router as add_user_to_company_router
from ats.api.hr.edit_compamy import router as edit_company_router
from ats.api.hr.update_vacancy import router as update_vacancy_router
from ats.api.admin.get_vacancies import router as admin_get_vacancies_router
from ats.api.admin.update_vacancy_status import router as admin_update_vacancy_status_router
from ats.api.feed.get_vacancies import router as feed_get_vacancies_router
from ats.api.feed.vacancy_info import router as feed_vacancy_info_router
from ats.api.feed.companies_suggest import router as feed_companies_suggest_router
from ats.api.candidate.respond_no_login import router as respond_no_login_router
from ats.api.hr.get_responds import router as get_responds_router
from ats.api.hr.get_responds_stats import router as get_responds_stats_router
from ats.api.hr.update_respond_status import router as update_respond_status_router
from ats.api.hr.update_vacancy_status import router as update_vacancy_status_router
from ats.api.candidate.get_my_responds import router as get_my_responds_router
from ats.api.candidate.respond import router as respond_router
from ats.api.candidate.register import router as candidate_register_router
from ats.api.cv.add import router as cv_add_router
from ats.api.cv.info import router as cv_info_router
from ats.api.cv.generate_pdf import router as cv_generate_pdf_router


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
router.include_router(hr_user_suggest_router)
router.include_router(add_user_to_company_router)
router.include_router(edit_company_router)
router.include_router(update_vacancy_router)
router.include_router(admin_get_vacancies_router)
router.include_router(admin_update_vacancy_status_router)
router.include_router(feed_get_vacancies_router)
router.include_router(feed_vacancy_info_router)
router.include_router(feed_companies_suggest_router)
router.include_router(respond_no_login_router)
router.include_router(get_responds_router)
router.include_router(get_responds_stats_router)
router.include_router(update_respond_status_router)
router.include_router(update_vacancy_status_router)
router.include_router(get_my_responds_router)
router.include_router(respond_router)
router.include_router(candidate_register_router)
router.include_router(cv_add_router)
router.include_router(cv_info_router)
router.include_router(cv_generate_pdf_router)

__all__ = [
    "router",
]
