import type { Route } from "./+types/funnel";
import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useState, useRef } from "react";
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

interface VacancyOption {
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

interface StatusStats {
  status: string;
  count: number;
}

interface VacancyStats {
  vacancy_id: number;
  vacancy_title: string;
  company_name: string;
  total_responds: number;
  status_breakdown: StatusStats[];
}

interface RespondsStatsResponse {
  total_responds: number;
  vacancies: VacancyStats[];
  overall_status_breakdown: StatusStats[];
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [responds, setResponds] = useState<EmployeeRespond[]>([]);
  const [vacancies, setVacancies] = useState<VacancyOption[]>([]);
  const [stats, setStats] = useState<RespondsStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters - initialize from URL params
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [selectedVacancyIds, setSelectedVacancyIds] = useState<number[]>(() => {
    const vacancyIds = searchParams.get("vacancies");
    return vacancyIds ? vacancyIds.split(",").map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : [];
  });
  const [userSearchTerm, setUserSearchTerm] = useState(searchParams.get("search") || "");
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [vacancySearchTerm, setVacancySearchTerm] = useState("");
  const [isVacancySearchOpen, setIsVacancySearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Function to update URL with current filter state
  const updateUrlWithFilters = (newStatusFilter: string, newSelectedVacancyIds: number[], newUserSearchTerm: string) => {
    const params = new URLSearchParams();
    
    if (newStatusFilter) {
      params.set("status", newStatusFilter);
    }
    
    if (newSelectedVacancyIds.length > 0) {
      params.set("vacancies", newSelectedVacancyIds.join(","));
    }
    
    if (newUserSearchTerm) {
      params.set("search", newUserSearchTerm);
    }
    
    const newSearch = params.toString();
    const newUrl = newSearch ? `?${newSearch}` : window.location.pathname;
    
    // Update URL without triggering navigation
    window.history.replaceState({}, "", newUrl);
  };

  // Function to clear all filters
  const clearAllFilters = () => {
    setStatusFilter("");
    setSelectedVacancyIds([]);
    setUserSearchTerm("");
    setVacancySearchTerm("");
    setIsVacancySearchOpen(false);
    setHighlightedIndex(-1);
  };

  const updateRespondStatus = async (respondId: number, newStatus: string) => {
    try {
      setUpdatingStatus(respondId);
      setError(null);
      
      const response = await fetch(getApiUrl("/api/v1/ats/hr/responds/status"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          respond_id: respondId,
          status: newStatus,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the respond in the local state
        setResponds(prevResponds => 
          prevResponds.map(respond => 
            respond.id === respondId 
              ? { ...respond, status: newStatus }
              : respond
          )
        );
        // Refresh stats to reflect the status change
        fetchStats();
        console.log("Status updated:", data.message);
      } else if (response.status === 401) {
        navigate("/login");
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Ошибка обновления статуса");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      setError("Ошибка обновления статуса");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const fetchVacancies = async () => {
    try {
      const response = await fetch(getApiUrl("/api/v1/ats/hr/vacancies"), {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setVacancies(data);
      } else if (response.status === 401) {
        navigate("/login");
      } else {
        console.error("Error fetching vacancies");
      }
    } catch (error) {
      console.error("Error fetching vacancies:", error);
    }
  };

  const fetchResponds = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (selectedVacancyIds.length > 0) {
        selectedVacancyIds.forEach(id => params.append("vacancy_id", id.toString()));
      }
      
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

  const fetchStats = async () => {
    try {
      // If no vacancies are selected, get stats for all user's vacancies
      const vacancyIdsToFetch = selectedVacancyIds.length > 0 ? selectedVacancyIds : vacancies.map(v => v.id);
      
      if (vacancyIdsToFetch.length === 0) {
        setStats(null);
        return;
      }

      const params = new URLSearchParams();
      vacancyIdsToFetch.forEach(id => params.append("vacancy_ids", id.toString()));
      
      const response = await fetch(getApiUrl(`/api/v1/ats/hr/responds/stats?${params.toString()}`), {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401) {
        navigate("/login");
      } else {
        console.error("Error fetching stats");
        setStats(null);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      setStats(null);
    }
  };

  // Update URL when filters change
  useEffect(() => {
    updateUrlWithFilters(statusFilter, selectedVacancyIds, userSearchTerm);
  }, [statusFilter, selectedVacancyIds, userSearchTerm]);

  useEffect(() => {
    fetchVacancies();
    fetchResponds();
  }, [statusFilter, selectedVacancyIds]);

  // Fetch stats when vacancies are loaded or when selectedVacancyIds change
  useEffect(() => {
    if (vacancies.length > 0) {
      fetchStats();
    }
  }, [vacancies, selectedVacancyIds]);

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsVacancySearchOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isVacancySearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVacancySearchOpen]);

  // Filter responds by user search term (name, email, phone, telegram)
  const filteredResponds = responds.filter(respond => {
    if (!userSearchTerm) return true;
    const searchLower = userSearchTerm.toLowerCase();
    return (
      respond.user.name.toLowerCase().includes(searchLower) ||
      respond.user.email.toLowerCase().includes(searchLower) ||
      (respond.user.phone && respond.user.phone.toLowerCase().includes(searchLower)) ||
      (respond.user.telegram && respond.user.telegram.toLowerCase().includes(searchLower))
    );
  });

  // Helper functions to get stats from server response
  const getStatsForStatus = (status: string): number => {
    if (!stats) return 0;
    const statusBreakdown = stats.overall_status_breakdown.find(s => s.status === status);
    return statusBreakdown ? statusBreakdown.count : 0;
  };

  const getTotalStats = (): number => {
    if (!stats) return responds.length;
    return stats.total_responds;
  };

  const addVacancySelection = (vacancyId: number) => {
    if (!selectedVacancyIds.includes(vacancyId)) {
      setSelectedVacancyIds(prev => [...prev, vacancyId]);
    }
    setVacancySearchTerm("");
    setIsVacancySearchOpen(false);
    setHighlightedIndex(-1);
  };

  const removeVacancySelection = (vacancyId: number) => {
    setSelectedVacancyIds(prev => prev.filter(id => id !== vacancyId));
  };

  const getSelectedVacancies = () => {
    return vacancies.filter(vacancy => selectedVacancyIds.includes(vacancy.id));
  };

  const getFilteredVacancies = () => {
    if (!vacancySearchTerm.trim()) return [];
    
    const searchLower = vacancySearchTerm.toLowerCase();
    return vacancies.filter(vacancy => 
      !selectedVacancyIds.includes(vacancy.id) && (
        vacancy.title.toLowerCase().includes(searchLower) ||
        vacancy.company_name.toLowerCase().includes(searchLower)
      )
    );
  };

  const handleVacancySearchChange = (value: string) => {
    setVacancySearchTerm(value);
    setIsVacancySearchOpen(value.trim().length > 0);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const filteredVacancies = getFilteredVacancies();
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredVacancies.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev > 0 ? prev - 1 : filteredVacancies.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredVacancies.length) {
        addVacancySelection(filteredVacancies[highlightedIndex].id);
      }
    } else if (e.key === 'Escape') {
      setIsVacancySearchOpen(false);
      setHighlightedIndex(-1);
    }
  };

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
            <div className="funnel-filters-grid">
              <div className="funnel-filter-group">
                <label className="funnel-filter-label">Статус</label>
                <div className="funnel-filter-container">
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
              </div>

              <div className="funnel-filter-group">
                <label className="funnel-filter-label">Вакансии</label>
                <div className="funnel-multiselect-container" ref={searchRef}>
                  {/* Selected vacancy chips */}
                  <div className="funnel-selected-chips">
                    {getSelectedVacancies().map(vacancy => (
                      <div key={vacancy.id} className="funnel-chip">
                        <span className="funnel-chip-text">
                          {vacancy.title} - {vacancy.company_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeVacancySelection(vacancy.id)}
                          className="funnel-chip-remove"
                          aria-label={`Удалить ${vacancy.title}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Search input with suggestions */}
                  <div className="funnel-search-container">
                    <input
                      ref={inputRef}
                      type="text"
                      value={vacancySearchTerm}
                      onChange={(e) => handleVacancySearchChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setIsVacancySearchOpen(vacancySearchTerm.trim().length > 0)}
                      placeholder="Поиск вакансий..."
                      className="funnel-search-input"
                    />
                    
                    {isVacancySearchOpen && getFilteredVacancies().length > 0 && (
                      <div className="funnel-search-suggestions">
                        {getFilteredVacancies().map((vacancy, index) => (
                          <div
                            key={vacancy.id}
                            className={`funnel-search-suggestion ${
                              index === highlightedIndex ? 'highlighted' : ''
                            }`}
                            onClick={() => addVacancySelection(vacancy.id)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                          >
                            <div className="funnel-suggestion-title">{vacancy.title}</div>
                            <div className="funnel-suggestion-company">{vacancy.company_name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="funnel-filter-group">
                <label className="funnel-filter-label">Поиск кандидатов</label>
                <div className="funnel-filter-container">
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Поиск по имени, email, телефону..."
                    className="funnel-filter-input"
                  />
                </div>
              </div>

              <div className="funnel-filter-group">
                <label className="funnel-filter-label">Действия</label>
                <div className="funnel-filter-container">
                  <button 
                    onClick={fetchResponds}
                    className="funnel-refresh-button"
                  >
                    🔄 Обновить
                  </button>
                  <button 
                    onClick={clearAllFilters}
                    className="funnel-clear-button"
                  >
                    🗑️ Очистить фильтры
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="funnel-stats">
            <div 
              className={`funnel-stat-card ${statusFilter === "" ? "funnel-stat-card-selected" : ""}`}
              onClick={() => setStatusFilter("")}
              style={{ cursor: 'pointer' }}
            >
              <span className="funnel-stat-number">{getTotalStats()}</span>
              <span className="funnel-stat-label">Всего кандидатов</span>
            </div>
            <div 
              className={`funnel-stat-card ${statusFilter === "pending" ? "funnel-stat-card-selected" : ""}`}
              onClick={() => setStatusFilter("pending")}
              style={{ cursor: 'pointer' }}
            >
              <span className="funnel-stat-number">
                {getStatsForStatus("pending")}
              </span>
              <span className="funnel-stat-label">Ожидают рассмотрения</span>
            </div>
            <div 
              className={`funnel-stat-card ${statusFilter === "interview_pending" ? "funnel-stat-card-selected" : ""}`}
              onClick={() => setStatusFilter("interview_pending")}
              style={{ cursor: 'pointer' }}
            >
              <span className="funnel-stat-number">
                {getStatsForStatus("interview_pending")}
              </span>
              <span className="funnel-stat-label">На интервью</span>
            </div>
            <div 
              className={`funnel-stat-card ${statusFilter === "job_accepted" ? "funnel-stat-card-selected" : ""}`}
              onClick={() => setStatusFilter("job_accepted")}
              style={{ cursor: 'pointer' }}
            >
              <span className="funnel-stat-number">
                {getStatsForStatus("job_accepted")}
              </span>
              <span className="funnel-stat-label">Приняты</span>
            </div>
            <div 
              className={`funnel-stat-card ${statusFilter === "rejected" ? "funnel-stat-card-selected" : ""}`}
              onClick={() => setStatusFilter("rejected")}
              style={{ cursor: 'pointer' }}
            >
              <span className="funnel-stat-number">
                {getStatsForStatus("rejected")}
              </span>
              <span className="funnel-stat-label">Отказ</span>
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
                    
                    <div className="funnel-respond-vacancy">
                      <h4 className="funnel-respond-vacancy-title">{respond.vacancy.title}</h4>
                      <p className="funnel-respond-company">{respond.vacancy.company_name}</p>
                    </div>
             
                    <div className="funnel-respond-header">
                      <div className="funnel-respond-user">
                        <h3 className="funnel-respond-name">{respond.user.name}</h3>
                        <p className="funnel-respond-email">{respond.user.email}</p>
                      </div>
                      <span className={`funnel-respond-status ${STATUS_COLORS[respond.status]}`}>
                        {STATUS_LABELS[respond.status]}
                      </span>
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

                    {/* Status Update Section */}
                    <div className="funnel-respond-status-update">
                      <label className="funnel-status-update-label">Изменить статус:</label>
                      <div className="funnel-status-update-controls">
                        <select
                          value={respond.status}
                          onChange={(e) => updateRespondStatus(respond.id, e.target.value)}
                          disabled={updatingStatus === respond.id}
                          className="funnel-status-update-select"
                        >
                          {STATUS_OPTIONS.filter(option => option.value !== "").map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {updatingStatus === respond.id && (
                          <span className="funnel-status-updating">Обновление...</span>
                        )}
                      </div>
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
