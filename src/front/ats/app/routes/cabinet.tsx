import type { Route } from "./+types/cabinet";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { getApiUrl } from "../utils/api";
import { Navbar } from "../components/Navbar";
import "./cabinet.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Личный кабинет - ProfessionMap ATS" },
    { name: "description", content: "Личный кабинет пользователя системы управления вакансиями" },
  ];
}

export default function Cabinet() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isCandidate, setIsCandidate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [vacancyStats, setVacancyStats] = useState<{
    active_vacancies: number;
    on_review_vacancies: number;
    total_vacancies: number;
    total_responds: number;
    pending_responds: number;
    rejected_responds: number;
    interview_pending_responds: number;
    job_offer_responds: number;
    job_accepted_responds: number;
  } | null>(null);

  const fetchVacancyStats = async () => {
    try {
      const response = await fetch(getApiUrl("/api/v1/ats/hr/vacancies/stats"), {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setVacancyStats(data);
      } else {
        console.error("Failed to fetch vacancy stats:", response.status);
      }
    } catch (error) {
      console.error("Error fetching vacancy stats:", error);
    }
  };

  useEffect(() => {
    // Fetch user info - the cookie will be automatically included in the request
    const fetchUserInfo = async () => {
      try {
        const response = await fetch(getApiUrl("/api/v1/ats/auth/user_info"), {
          credentials: "include", // This ensures cookies are sent with the request
        });

        if (response.ok) {
          const data = await response.json();
          setUserInfo(data);
          setIsCandidate(data.roles && data.roles.includes('candidate'));
          // Fetch vacancy stats after user info is loaded
          await fetchVacancyStats();
        } else {
          // If unauthorized, redirect to login
          navigate("/login");
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [navigate]);


  if (isLoading) {
    return (
      <main className="cabinet-loading">
        <div className="cabinet-loading-spinner">
          <div className="spinner"></div>
          <p>Загрузка...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Navbar currentPath="/cabinet" />
      <main className="cabinet-container">
        <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="cabinet-header">
          <div>
            <h1 className="cabinet-title">Личный кабинет</h1>
            <p className="cabinet-subtitle">Добро пожаловать, {userInfo?.email}</p>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="cabinet-dashboard">
          {isCandidate ? (
            /* Candidate Dashboard */
            <>
              <div 
                className="cabinet-stats-card clickable"
                onClick={() => navigate("/apply")}
                style={{ cursor: 'pointer' }}
              >
                <h3 className="cabinet-stats-title">Мои заявки</h3>
                <p className="cabinet-stats-value active">
                  Посмотреть заявки
                </p>
                <p className="cabinet-stats-subtitle">Статус ваших заявок на вакансии</p>
              </div>

              <div 
                className="cabinet-stats-card clickable"
                onClick={() => navigate("/")}
                style={{ cursor: 'pointer' }}
              >
                <h3 className="cabinet-stats-title">Найти работу</h3>
                <p className="cabinet-stats-value candidates">
                  Поиск вакансий
                </p>
                <p className="cabinet-stats-subtitle">Просмотр доступных вакансий</p>
              </div>

              <div 
                className="cabinet-stats-card clickable"
                onClick={() => navigate("/job_page/1")}
                style={{ cursor: 'pointer' }}
              >
                <h3 className="cabinet-stats-title">Популярные вакансии</h3>
                <p className="cabinet-stats-value interviews">
                  Посмотреть
                </p>
                <p className="cabinet-stats-subtitle">Актуальные предложения работы</p>
              </div>
            </>
          ) : (
            /* HR Dashboard */
            <>
              <div 
                className="cabinet-stats-card clickable"
                onClick={() => navigate("/cabinet/my-vacancies?status=ACTIVE")}
                style={{ cursor: 'pointer' }}
              >
                <h3 className="cabinet-stats-title">Активные вакансии</h3>
                <p className="cabinet-stats-value active">
                  {vacancyStats?.active_vacancies ?? 0}
                </p>
                <p className="cabinet-stats-subtitle">На модерации: {vacancyStats?.on_review_vacancies ?? 0}</p>
              </div>

              <div 
                className="cabinet-stats-card clickable"
                onClick={() => navigate("/cabinet/funnel")}
                style={{ cursor: 'pointer' }}
              >
                <h3 className="cabinet-stats-title">Кандидаты</h3>
                <p className="cabinet-stats-value candidates">
                  {vacancyStats?.total_responds ?? 0}
                </p>
                <p className="cabinet-stats-subtitle">
                  Всего кандидатов • Ожидают: {vacancyStats?.pending_responds ?? 0}
                </p>
              </div>

              <div 
                className="cabinet-stats-card clickable"
                onClick={() => navigate("/cabinet/funnel")}
                style={{ cursor: 'pointer' }}
              >
                <h3 className="cabinet-stats-title">Интервью</h3>
                <p className="cabinet-stats-value interviews">
                  {vacancyStats?.interview_pending_responds ?? 0}
                </p>
                <p className="cabinet-stats-subtitle">
                  Запланировано • Предложения: {vacancyStats?.job_offer_responds ?? 0}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="cabinet-actions">
          <h2 className="cabinet-actions-title">Быстрые действия</h2>
          <div className="cabinet-actions-grid">
            {isCandidate ? (
              /* Candidate Actions */
              <>
                <button 
                  onClick={() => navigate("/apply")}
                  className="cabinet-action-button"
                >
                  <h3 className="cabinet-action-title">Мои заявки</h3>
                  <p className="cabinet-action-description">Просмотр статуса заявок</p>
                </button>

                <button 
                  onClick={() => navigate("/")}
                  className="cabinet-action-button"
                >
                  <h3 className="cabinet-action-title">Поиск вакансий</h3>
                  <p className="cabinet-action-description">Найти подходящие вакансии</p>
                </button>

                <button 
                  onClick={() => navigate("/job_page/1")}
                  className="cabinet-action-button"
                >
                  <h3 className="cabinet-action-title">Популярные вакансии</h3>
                  <p className="cabinet-action-description">Актуальные предложения</p>
                </button>
              </>
            ) : (
              /* HR Actions */
              <>
                <button 
                  onClick={() => navigate("/cabinet/my-companies")}
                  className="cabinet-action-button"
                >
                  <h3 className="cabinet-action-title">Мои компании</h3>
                  <p className="cabinet-action-description">Управление компаниями</p>
                </button>

                <button 
                  onClick={() => navigate("/cabinet/my-vacancies")}
                  className="cabinet-action-button"
                >
                  <h3 className="cabinet-action-title">Мои вакансии</h3>
                  <p className="cabinet-action-description">Управление вакансиями</p>
                </button>

                <button 
                  onClick={() => navigate("/cabinet/funnel")}
                  className="cabinet-action-button"
                >
                  <h3 className="cabinet-action-title">Воронка найма</h3>
                  <p className="cabinet-action-description">Управление кандидатами и откликами</p>
                </button>

                <button className="cabinet-action-button">
                  <h3 className="cabinet-action-title">Добавить кандидата</h3>
                  <p className="cabinet-action-description">Зарегистрировать нового кандидата</p>
                </button>

                <button className="cabinet-action-button">
                  <h3 className="cabinet-action-title">Просмотр отчетов</h3>
                  <p className="cabinet-action-description">Аналитика и статистика</p>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="cabinet-activity">
          <h2 className="cabinet-activity-title">Последняя активность</h2>
          <div className="cabinet-activity-empty">
            <p>Активность отсутствует</p>
          </div>
        </div>
      </div>
      </main>
    </>
  );
}
