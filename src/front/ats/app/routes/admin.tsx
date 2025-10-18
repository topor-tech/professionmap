import type { Route } from "./+types/admin";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { getApiUrl } from "../utils/api";
import { Navbar } from "../components/Navbar";
import "./admin.css";

interface Vacancy {
  id: number;
  title: string;
  description: string;
  requirements: string;
  status: "Active" | "Closed" | "On Review";
  company_name: string;
  created_at: string;
  expires_at?: string;
}

interface UserInfo {
  id: number;
  email: string;
  name: string;
  roles: string[];
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Админ панель - ProfessionMap ATS" },
    { name: "description", content: "Панель администратора для модерации вакансий" },
  ];
}

export default function Admin() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "On Review" | "Active" | "Closed">("On Review");
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    expires_at: ""
  });

  const fetchUserInfo = async () => {
    try {
      const response = await fetch(getApiUrl("/api/v1/ats/auth/user_info"), {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data);
        
        // Check if user has admin or superuser role
        if (!data.roles.includes("admin") && !data.roles.includes("superuser")) {
          navigate("/cabinet");
          return;
        }
      } else {
        navigate("/login");
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      navigate("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVacancies = async () => {
    try {
      const response = await fetch(getApiUrl("/api/v1/ats/admin/vacancies"), {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setVacancies(data);
      } else {
        console.error("Failed to fetch vacancies:", response.status);
      }
    } catch (error) {
      console.error("Error fetching vacancies:", error);
    }
  };

  const updateVacancyStatus = async (vacancyId: number, newStatus: "Active" | "Closed") => {
    setIsUpdating(vacancyId);
    try {
      const response = await fetch(getApiUrl(`/api/v1/ats/admin/vacancies/${vacancyId}/status`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update local state
        setVacancies(prev => 
          prev.map(vacancy => 
            vacancy.id === vacancyId 
              ? { ...vacancy, status: newStatus }
              : vacancy
          )
        );
      } else {
        console.error("Failed to update vacancy status:", response.status);
        alert("Ошибка при обновлении статуса вакансии");
      }
    } catch (error) {
      console.error("Error updating vacancy status:", error);
      alert("Ошибка при обновлении статуса вакансии");
    } finally {
      setIsUpdating(null);
    }
  };

  const startEditingVacancy = (vacancy: Vacancy) => {
    setEditingVacancy(vacancy);
    setEditFormData({
      title: vacancy.title,
      description: vacancy.description || "",
      requirements: vacancy.requirements || "",
      expires_at: vacancy.expires_at ? new Date(vacancy.expires_at).toISOString().slice(0, 16) : ""
    });
  };

  const cancelEditing = () => {
    setEditingVacancy(null);
    setEditFormData({
      title: "",
      description: "",
      requirements: "",
      expires_at: ""
    });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const updateVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVacancy) return;

    setIsUpdating(editingVacancy.id);
    try {
      const response = await fetch(getApiUrl(`/api/v1/ats/hr/vacancies/${editingVacancy.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description || null,
          requirements: editFormData.requirements || null,
          expires_at: editFormData.expires_at ? new Date(editFormData.expires_at).toISOString() : null
        }),
      });

      if (response.ok) {
        const updatedVacancy = await response.json();
        // Update local state
        setVacancies(prev => 
          prev.map(vacancy => 
            vacancy.id === editingVacancy.id 
              ? { ...vacancy, ...updatedVacancy }
              : vacancy
          )
        );
        cancelEditing();
        alert("Вакансия успешно обновлена");
      } else {
        const errorData = await response.json();
        console.error("Failed to update vacancy:", errorData);
        alert("Ошибка при обновлении вакансии: " + (errorData.detail || "Неизвестная ошибка"));
      }
    } catch (error) {
      console.error("Error updating vacancy:", error);
      alert("Ошибка при обновлении вакансии");
    } finally {
      setIsUpdating(null);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, [navigate]);

  useEffect(() => {
    if (userInfo) {
      fetchVacancies();
    }
  }, [userInfo]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingVacancy) {
        cancelEditing();
      }
    };

    if (editingVacancy) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [editingVacancy]);

  const filteredVacancies = filterStatus === "all" 
    ? vacancies 
    : vacancies.filter(vacancy => vacancy.status === filterStatus);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "admin-status-active";
      case "Closed":
        return "admin-status-closed";
      case "On Review":
        return "admin-status-review";
      default:
        return "admin-status-default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "Active":
        return "Активная";
      case "Closed":
        return "Закрыта";
      case "On Review":
        return "На модерации";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <main className="admin-loading">
        <div className="admin-loading-spinner">
          <div className="spinner"></div>
          <p>Загрузка...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Navbar currentPath="/admin" />
      <main className="admin-container">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <header className="admin-header">
            <div>
              <h1 className="admin-title">Админ панель</h1>
              <p className="admin-subtitle">Модерация вакансий</p>
            </div>
            <div className="admin-stats">
              <div className="admin-stat-card">
                <span className="admin-stat-number">{vacancies.filter(v => v.status === "On Review").length}</span>
                <span className="admin-stat-label">На модерации</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{vacancies.filter(v => v.status === "Active").length}</span>
                <span className="admin-stat-label">Активные</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-number">{vacancies.filter(v => v.status === "Closed").length}</span>
                <span className="admin-stat-label">Закрытые</span>
              </div>
            </div>
          </header>

          {/* Filters */}
          <div className="admin-filters">
            <div className="admin-filter-group">
              <label className="admin-filter-label">Фильтр по статусу:</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="admin-filter-select"
              >
                <option value="all">Все вакансии</option>
                <option value="On Review">На модерации</option>
                <option value="Active">Активные</option>
                <option value="Closed">Закрытые</option>
              </select>
            </div>
          </div>

          {/* Vacancies List */}
          <div className="admin-vacancies">
            {filteredVacancies.length === 0 ? (
              <div className="admin-empty">
                <p>Нет вакансий для отображения</p>
              </div>
            ) : (
              <div className="admin-vacancies-grid">
                {filteredVacancies.map((vacancy) => (
                  <div key={vacancy.id} className="admin-vacancy-card">
                    <div className="admin-vacancy-header">
                      <h3 className="admin-vacancy-title">{vacancy.title}</h3>
                      <span className={`admin-vacancy-status ${getStatusColor(vacancy.status)}`}>
                        {getStatusText(vacancy.status)}
                      </span>
                    </div>
                    
                    <div className="admin-vacancy-company">
                      <strong>Компания:</strong> {vacancy.company_name}
                    </div>
                    
                    {vacancy.description && (
                      <div className="admin-vacancy-description">
                        <strong>Описание:</strong>
                        <p>{vacancy.description}</p>
                      </div>
                    )}
                    
                    {vacancy.requirements && (
                      <div className="admin-vacancy-requirements">
                        <strong>Требования:</strong>
                        <p>{vacancy.requirements}</p>
                      </div>
                    )}
                    
                    <div className="admin-vacancy-meta">
                      <div className="admin-vacancy-date">
                        <strong>Создана:</strong> {new Date(vacancy.created_at).toLocaleDateString('ru-RU')}
                      </div>
                      {vacancy.expires_at && (
                        <div className="admin-vacancy-expires">
                          <strong>Истекает:</strong> {new Date(vacancy.expires_at).toLocaleDateString('ru-RU')}
                        </div>
                      )}
                    </div>

                    <div className="admin-vacancy-actions">
                      <button
                        onClick={() => startEditingVacancy(vacancy)}
                        className="admin-action-button admin-action-edit"
                        title="Редактировать вакансию"
                      >
                        Редактировать
                      </button>
                      
                      {vacancy.status === "On Review" && (
                        <>
                          <button
                            onClick={() => updateVacancyStatus(vacancy.id, "Active")}
                            disabled={isUpdating === vacancy.id}
                            className="admin-action-button admin-action-approve"
                          >
                            {isUpdating === vacancy.id ? "Обновление..." : "Одобрить"}
                          </button>
                          <button
                            onClick={() => updateVacancyStatus(vacancy.id, "Closed")}
                            disabled={isUpdating === vacancy.id}
                            className="admin-action-button admin-action-reject"
                          >
                            {isUpdating === vacancy.id ? "Обновление..." : "Отклонить"}
                          </button>
                        </>
                      )}

                      {vacancy.status === "Active" && (
                        <button
                          onClick={() => updateVacancyStatus(vacancy.id, "Closed")}
                          disabled={isUpdating === vacancy.id}
                          className="admin-action-button admin-action-close"
                        >
                          {isUpdating === vacancy.id ? "Обновление..." : "Закрыть"}
                        </button>
                      )}

                      {vacancy.status === "Closed" && (
                        <button
                          onClick={() => updateVacancyStatus(vacancy.id, "Active")}
                          disabled={isUpdating === vacancy.id}
                          className="admin-action-button admin-action-reopen"
                        >
                          {isUpdating === vacancy.id ? "Обновление..." : "Открыть"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Vacancy Modal */}
        {editingVacancy && (
          <div 
            className="admin-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                cancelEditing();
              }
            }}
          >
            <div className="admin-modal">
              <h2 className="admin-modal-title">Редактировать вакансию</h2>
              <form onSubmit={updateVacancy}>
                <div className="admin-form-group">
                  <label htmlFor="edit_title" className="admin-form-label">
                    Название вакансии *
                  </label>
                  <input
                    type="text"
                    id="edit_title"
                    name="title"
                    value={editFormData.title}
                    onChange={handleEditInputChange}
                    required
                    className="admin-form-input"
                    placeholder="Введите название вакансии"
                  />
                </div>
                
                <div className="admin-form-group">
                  <label htmlFor="edit_description" className="admin-form-label">
                    Описание вакансии
                  </label>
                  <textarea
                    id="edit_description"
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditInputChange}
                    rows={3}
                    className="admin-form-textarea"
                    placeholder="Описание вакансии"
                  />
                </div>
                
                <div className="admin-form-group">
                  <label htmlFor="edit_requirements" className="admin-form-label">
                    Требования
                  </label>
                  <textarea
                    id="edit_requirements"
                    name="requirements"
                    value={editFormData.requirements}
                    onChange={handleEditInputChange}
                    rows={3}
                    className="admin-form-textarea"
                    placeholder="Требования к кандидату"
                  />
                </div>
                
                <div className="admin-form-group">
                  <label htmlFor="edit_expires_at" className="admin-form-label">
                    Дата окончания
                  </label>
                  <input
                    type="datetime-local"
                    id="edit_expires_at"
                    name="expires_at"
                    value={editFormData.expires_at}
                    onChange={handleEditInputChange}
                    className="admin-form-input"
                  />
                </div>
                
                <div className="admin-form-actions">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="admin-form-button cancel"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating === editingVacancy.id}
                    className="admin-form-button submit"
                  >
                    {isUpdating === editingVacancy.id ? "Обновление..." : "Обновить"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
