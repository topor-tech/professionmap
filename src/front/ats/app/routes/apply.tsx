import type { Route } from "./+types/apply";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { getApiUrl } from "../utils/api";
import { CandidateNavbar } from "../components/CandidateNavbar";
import "./apply.css";

interface EmployeeRespond {
  id: number;
  vacancy: {
    id: number;
    title: string;
    company_name: string;
    status: string;
  };
  status: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  pending: "Ожидает рассмотрения",
  rejected: "Отклонено",
  interview_pending: "Запланировано интервью",
  job_offer: "Предложение о работе",
  job_accepted: "Принято на работу"
};

const statusColors: Record<string, string> = {
  pending: "#f59e0b",
  rejected: "#ef4444",
  interview_pending: "#3b82f6",
  job_offer: "#10b981",
  job_accepted: "#059669"
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Мои заявки - ProfessionMap" },
    { name: "description", content: "Просмотр статуса ваших заявок на вакансии" },
  ];
}

export default function Apply() {
  const navigate = useNavigate();
  const [responds, setResponds] = useState<EmployeeRespond[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First, get user info to check authentication
        const userResponse = await fetch(getApiUrl("/api/v1/ats/auth/user_info"), {
          credentials: "include",
        });

        if (!userResponse.ok) {
          navigate("/login");
          return;
        }

        const userData = await userResponse.json();
        setUserInfo(userData);

        // Then fetch the user's responds
        const respondsResponse = await fetch(getApiUrl("/api/v1/ats/candidate/my-responds"), {
          credentials: "include",
        });

        if (respondsResponse.ok) {
          const respondsData = await respondsResponse.json();
          setResponds(respondsData);
        } else {
          console.error("Failed to fetch responds:", respondsResponse.status);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <main className="apply-loading">
        <div className="apply-loading-spinner">
          <div className="spinner"></div>
          <p>Загрузка ваших заявок...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <CandidateNavbar currentPath="/apply" />
      <main className="apply-container">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <header className="apply-header">
            <div>
              <p className="apply-subtitle">
                Добро пожаловать, {userInfo?.name || userInfo?.email}
              </p>
            </div>
          </header>

          {/* Stats Summary */}
          <div className="apply-stats">
            <div className="apply-stats-card">
              <h3 className="apply-stats-title">Всего заявок</h3>
              <p className="apply-stats-value">{responds.length}</p>
            </div>
            <div className="apply-stats-card">
              <h3 className="apply-stats-title">Ожидают рассмотрения</h3>
              <p className="apply-stats-value pending">
                {responds.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="apply-stats-card">
              <h3 className="apply-stats-title">Интервью</h3>
              <p className="apply-stats-value interview">
                {responds.filter(r => r.status === 'interview_pending').length}
              </p>
            </div>
            <div className="apply-stats-card">
              <h3 className="apply-stats-title">Предложения</h3>
              <p className="apply-stats-value offer">
                {responds.filter(r => r.status === 'job_offer').length}
              </p>
            </div>
          </div>

          {/* Applications List */}
          <div className="apply-list">
            <h2 className="apply-list-title">Ваши заявки</h2>
            
            {responds.length === 0 ? (
              <div className="apply-empty">
                <div className="apply-empty-icon">📝</div>
                <h3 className="apply-empty-title">У вас пока нет заявок</h3>
                <p className="apply-empty-description">
                  Найдите интересные вакансии и подайте заявку
                </p>
                <button 
                  onClick={() => navigate("/jobs")}
                  className="apply-empty-button"
                >
                  Посмотреть вакансии
                </button>
              </div>
            ) : (
              <div className="apply-cards">
                {responds.map((respond) => (
                  <div key={respond.id} className="apply-card">
                    <div className="apply-card-header">
                      <div className="apply-card-info">
                        <h3 className="apply-card-title">{respond.vacancy.title}</h3>
                        <p className="apply-card-company">{respond.vacancy.company_name}</p>
                      </div>
                      <div 
                        className="apply-card-status"
                        style={{ 
                          backgroundColor: statusColors[respond.status],
                          color: 'white'
                        }}
                      >
                        {statusLabels[respond.status]}
                      </div>
                    </div>
                    
                    <div className="apply-card-details">
                      <div className="apply-card-meta">
                        <span className="apply-card-date">
                          Подана: {formatDate(respond.created_at)}
                        </span>
                        <span className="apply-card-vacancy-status">
                          Статус вакансии: {respond.vacancy.status === 'ACTIVE' ? 'Активна' : 'Неактивна'}
                        </span>
                      </div>
                    </div>

                    <div className="apply-card-actions">
                      <button 
                        onClick={() => navigate(`/job_page/${respond.vacancy.id}`)}
                        className="apply-card-button"
                      >
                        Посмотреть вакансию
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
