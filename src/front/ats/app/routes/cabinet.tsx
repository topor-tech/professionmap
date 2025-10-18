import type { Route } from "./+types/cabinet";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { getApiUrl } from "../utils/api";
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
  const [isLoading, setIsLoading] = useState(true);
  const [vacancyStats, setVacancyStats] = useState<{
    active_vacancies: number;
    on_review_vacancies: number;
    total_vacancies: number;
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

  const handleLogout = async () => {
    try {
      // Call the backend logout endpoint to clear the cookie
      await fetch(getApiUrl("/api/v1/ats/auth/logout"), {
        method: "POST",
        credentials: "include", // Include cookies in the request
      });
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Navigate to login regardless of logout API call result
      navigate("/login");
    }
  };

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
    <main className="cabinet-container">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="cabinet-header">
          <div>
            <h1 className="cabinet-title">Личный кабинет</h1>
            <p className="cabinet-subtitle">Добро пожаловать, {userInfo?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="cabinet-logout-button"
          >
            Выйти
          </button>
        </header>

        {/* Dashboard Content */}
        <div className="cabinet-dashboard">
          {/* Stats Cards */}
          <div className="cabinet-stats-card">
            <h3 className="cabinet-stats-title">Активные вакансии</h3>
            <p className="cabinet-stats-value active">
              {vacancyStats?.active_vacancies ?? 0}
            </p>
            <p className="cabinet-stats-subtitle">На модерации: {vacancyStats?.on_review_vacancies ?? 0}</p>
          </div>

          <div className="cabinet-stats-card">
            <h3 className="cabinet-stats-title">Кандидаты</h3>
            <p className="cabinet-stats-value candidates">0</p>
            <p className="cabinet-stats-subtitle">Всего кандидатов</p>
          </div>

          <div className="cabinet-stats-card">
            <h3 className="cabinet-stats-title">Интервью</h3>
            <p className="cabinet-stats-value interviews">0</p>
            <p className="cabinet-stats-subtitle">Запланировано</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="cabinet-actions">
          <h2 className="cabinet-actions-title">Быстрые действия</h2>
          <div className="cabinet-actions-grid">
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

            <button className="cabinet-action-button">
              <h3 className="cabinet-action-title">Добавить кандидата</h3>
              <p className="cabinet-action-description">Зарегистрировать нового кандидата</p>
            </button>

            <button className="cabinet-action-button">
              <h3 className="cabinet-action-title">Просмотр отчетов</h3>
              <p className="cabinet-action-description">Аналитика и статистика</p>
            </button>
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
  );
}
