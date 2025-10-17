import type { Route } from "./+types/cabinet";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { getApiUrl } from "../utils/api";

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

  useEffect(() => {
    // Fetch user info - the cookie will be automatically included in the request
    const fetchUserInfo = async () => {
      try {
        const response = await fetch(getApiUrl("/api/v1/ats/user_info"), {
          credentials: "include", // This ensures cookies are sent with the request
        });

        if (response.ok) {
          const data = await response.json();
          setUserInfo(data);
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
      await fetch(getApiUrl("/api/v1/ats/logout"), {
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
      <main className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#030e18', color: 'var(--color-text-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#030e18', color: 'var(--color-text-primary)' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Личный кабинет</h1>
            <p className="text-lg opacity-80">Добро пожаловать, {userInfo?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-accent)';
            }}
          >
            Выйти
          </button>
        </header>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Активные вакансии</h3>
            <p className="text-3xl font-bold text-blue-400">0</p>
            <p className="text-sm opacity-70 mt-1">Всего вакансий</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Кандидаты</h3>
            <p className="text-3xl font-bold text-green-400">0</p>
            <p className="text-sm opacity-70 mt-1">Всего кандидатов</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Интервью</h3>
            <p className="text-3xl font-bold text-yellow-400">0</p>
            <p className="text-sm opacity-70 mt-1">Запланировано</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6">Быстрые действия</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => navigate("/cabinet/my-companies")}
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-left transition-colors"
            >
              <h3 className="text-lg font-semibold mb-2">Мои компании</h3>
              <p className="text-sm opacity-70">Управление компаниями</p>
            </button>

            <button 
              onClick={() => navigate("/cabinet/my-vacancies")}
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-left transition-colors"
            >
              <h3 className="text-lg font-semibold mb-2">Мои вакансии</h3>
              <p className="text-sm opacity-70">Управление вакансиями</p>
            </button>

            <button className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-left transition-colors">
              <h3 className="text-lg font-semibold mb-2">Добавить кандидата</h3>
              <p className="text-sm opacity-70">Зарегистрировать нового кандидата</p>
            </button>

            <button className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-left transition-colors">
              <h3 className="text-lg font-semibold mb-2">Просмотр отчетов</h3>
              <p className="text-sm opacity-70">Аналитика и статистика</p>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6">Последняя активность</h2>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-center opacity-70">Активность отсутствует</p>
          </div>
        </div>
      </div>
    </main>
  );
}
