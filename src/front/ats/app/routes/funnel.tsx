import type { Route } from "./+types/funnel";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { getApiUrl } from "../utils/api";
import { Navbar } from "../components/Navbar";
import "./funnel.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Воронка найма - ProfessionMap ATS" },
    { name: "description", content: "Управление кандидатами и откликами в воронке найма" },
  ];
}

interface UserInfo {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  telegram: string | null;
}

interface VacancyInfo {
  id: number;
  title: string;
  company_name: string;
}

interface EmployeeRespond {
  id: number;
  user: UserInfo;
  vacancy: VacancyInfo;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "Все статусы" },
  { value: "pending", label: "Ожидает рассмотрения" },
  { value: "rejected", label: "Отклонено" },
  { value: "interview_pending", label: "Интервью запланировано" },
  { value: "job_offer", label: "Предложение о работе" },
  { value: "job_accepted", label: "Принято предложение" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает рассмотрения",
  rejected: "Отклонено",
  interview_pending: "Интервью запланировано",
  job_offer: "Предложение о работе",
  job_accepted: "Принято предложение",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "status-pending",
  rejected: "status-rejected",
  interview_pending: "status-interview",
  job_offer: "status-offer",
  job_accepted: "status-accepted",
};

export default function Funnel() {
  const navigate = useNavigate();
  const [responds, setResponds] = useState<EmployeeRespond[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [vacancyFilter, setVacancyFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchResponds = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (vacancyFilter) params.append("vacancy_id", vacancyFilter);
      if (companyFilter) params.append("company_id", companyFilter);
      
      const response = await fetch(getApiUrl(`/api/v1/ats/hr/responds?${params.toString()}`), {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setResponds(data);
      } else if (response.status === 401) {
        navigate("/login");
      } else {
        setError("Ошибка загрузки данных");
      }
    } catch (error) {
      console.error("Error fetching responds:", error);
      setError("Ошибка загрузки данных");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResponds();
  }, [statusFilter, vacancyFilter, companyFilter]);

  // Filter responds by search term
  const filteredResponds = responds.filter(respond => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      respond.user.name.toLowerCase().includes(searchLower) ||
      respond.user.email.toLowerCase().includes(searchLower) ||
      respond.vacancy.title.toLowerCase().includes(searchLower) ||
      respond.vacancy.company_name.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <main className="funnel-loading">
        <div className="funnel-loading-spinner">
          <div className="spinner"></div>
          <p>Загрузка воронки найма...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Navbar currentPath="/cabinet/funnel" />
      <main className="funnel-container">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <header className="funnel-header">
            <div>
              <h1 className="funnel-title">Воронка найма</h1>
              <p className="funnel-subtitle">Управление кандидатами и откликами</p>
            </div>
            <button 
              onClick={() => navigate("/cabinet")}
              className="funnel-back-button"
            >
              ← Назад в кабинет
            </button>
          </header>

          {/* Filters */}
          <div className="funnel-filters">
            <div className="funnel-filters-row">
              <div className="funnel-filter-group">
                <label className="funnel-filter-label">Статус</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="funnel-filter-select"
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="funnel-filter-group">
                <label className="funnel-filter-label">Поиск</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Поиск по имени, email, вакансии..."
                  className="funnel-filter-input"
                />
              </div>

              <button 
                onClick={fetchResponds}
                className="funnel-refresh-button"
              >
                Обновить
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="funnel-stats">
            <div className="funnel-stat-card">
              <span className="funnel-stat-number">{filteredResponds.length}</span>
              <span className="funnel-stat-label">Всего кандидатов</span>
            </div>
            <div className="funnel-stat-card">
              <span className="funnel-stat-number">
                {filteredResponds.filter(r => r.status === "pending").length}
              </span>
              <span className="funnel-stat-label">Ожидают рассмотрения</span>
            </div>
            <div className="funnel-stat-card">
              <span className="funnel-stat-number">
                {filteredResponds.filter(r => r.status === "interview_pending").length}
              </span>
              <span className="funnel-stat-label">На интервью</span>
            </div>
            <div className="funnel-stat-card">
              <span className="funnel-stat-number">
                {filteredResponds.filter(r => r.status === "job_accepted").length}
              </span>
              <span className="funnel-stat-label">Приняты</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="funnel-error">
              <p>{error}</p>
              <button onClick={fetchResponds} className="funnel-retry-button">
                Попробовать снова
              </button>
            </div>
          )}

          {/* Responds List */}
          <div className="funnel-responds">
            {filteredResponds.length === 0 ? (
              <div className="funnel-empty">
                <p>Кандидаты не найдены</p>
                <p className="funnel-empty-subtitle">
                  Попробуйте изменить фильтры или обновить данные
                </p>
              </div>
            ) : (
              <div className="funnel-responds-grid">
                {filteredResponds.map((respond) => (
                  <div key={respond.id} className="funnel-respond-card">
                    <div className="funnel-respond-header">
                      <div className="funnel-respond-user">
                        <h3 className="funnel-respond-name">{respond.user.name}</h3>
                        <p className="funnel-respond-email">{respond.user.email}</p>
                      </div>
                      <span className={`funnel-respond-status ${STATUS_COLORS[respond.status]}`}>
                        {STATUS_LABELS[respond.status]}
                      </span>
                    </div>
                    
                    <div className="funnel-respond-vacancy">
                      <h4 className="funnel-respond-vacancy-title">{respond.vacancy.title}</h4>
                      <p className="funnel-respond-company">{respond.vacancy.company_name}</p>
                    </div>
                    
                    <div className="funnel-respond-footer">
                      <div className="funnel-respond-contacts">
                        {respond.user.phone && (
                          <span className="funnel-respond-contact">📞 {respond.user.phone}</span>
                        )}
                        {respond.user.telegram && (
                          <span className="funnel-respond-contact">💬 {respond.user.telegram}</span>
                        )}
                      </div>
                      <span className="funnel-respond-date">
                        {formatDate(respond.created_at)}
                      </span>
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
