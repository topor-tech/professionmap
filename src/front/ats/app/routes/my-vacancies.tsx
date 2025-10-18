import type { Route } from "./+types/my-vacancies";
import { useNavigate } from "react-router";
import { useEffect, useState, useRef } from "react";
import { getApiUrl } from "../utils/api";
import { Navbar } from "../components/Navbar";
import "./my-vacancies.css";
import { useToast } from "../components/ToastProvider";
import { SuggestionDropdown, type SuggestionItem } from "../components/SuggestionDropdown";
import "../components/SuggestionDropdown.css";

interface Vacancy {
  id: number;
  company_id: number;
  title: string;
  description: string | null;
  requirements: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  company_name: string;
}

interface Company {
  id: number;
  name: string;
  public_description: string | null;
  created_at: string;
}

interface CompanySuggestion extends SuggestionItem {}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Мои вакансии - ProfessionMap ATS" },
    { name: "description", content: "Управление вакансиями в системе управления вакансиями" },
  ];
}

export default function MyVacancies() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    company_id: "",
    title: "",
    description: "",
    requirements: "",
    expires_at: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    expires_at: ""
  });
  
  // Company suggestion states
  const [companySuggestions, setCompanySuggestions] = useState<CompanySuggestion[]>([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [selectedCompanyName, setSelectedCompanyName] = useState("");
  const companyInputRef = useRef<HTMLInputElement>(null);
  
  // Filter states
  const [filterSuggestions, setFilterSuggestions] = useState<CompanySuggestion[]>([]);
  const [showFilterSuggestions, setShowFilterSuggestions] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState("");
  const [selectedFilterCompanies, setSelectedFilterCompanies] = useState<CompanySuggestion[]>([]);
  const filterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch both vacancies and companies in parallel
      const [vacanciesResponse, companiesResponse] = await Promise.all([
        fetch(getApiUrl("/api/v1/ats/hr/vacancies"), {
          credentials: "include",
        }),
        fetch(getApiUrl("/api/v1/ats/hr/companies"), {
          credentials: "include",
        })
      ]);

      if (vacanciesResponse.ok && companiesResponse.ok) {
        const [vacanciesData, companiesData] = await Promise.all([
          vacanciesResponse.json(),
          companiesResponse.json()
        ]);
        setVacancies(vacanciesData);
        setCompanies(companiesData);
      } else if (vacanciesResponse.status === 401 || companiesResponse.status === 401) {
        navigate("/login");
      } else {
        console.error("Error fetching data:", vacanciesResponse.statusText);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVacancies = async (companyId?: number) => {
    try {
      const url = companyId 
        ? getApiUrl(`/api/v1/ats/hr/vacancies?company_id=${companyId}`)
        : getApiUrl("/api/v1/ats/hr/vacancies");
      
      const response = await fetch(url, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setVacancies(data);
      } else if (response.status === 401) {
        navigate("/login");
      } else {
        console.error("Error fetching vacancies:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching vacancies:", error);
    }
  };

  const fetchVacanciesByCompanies = async (companyIds: number[]) => {
    try {
      // Fetch all vacancies and filter on frontend since backend doesn't support multiple company_ids
      const response = await fetch(getApiUrl("/api/v1/ats/hr/vacancies"), {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        // Filter vacancies by selected companies
        const filteredVacancies = data.filter((vacancy: Vacancy) => 
          companyIds.includes(vacancy.company_id)
        );
        setVacancies(filteredVacancies);
      } else if (response.status === 401) {
        navigate("/login");
      } else {
        console.error("Error fetching vacancies:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching vacancies:", error);
    }
  };

  const handleCreateVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(getApiUrl("/api/v1/ats/hr/create_vacancy"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          company_id: parseInt(formData.company_id),
          expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
        }),
      });

      if (response.ok) {
        const newVacancy = await response.json();
        setVacancies([...vacancies, newVacancy]);
        setFormData({ 
          company_id: "", 
          title: "", 
          description: "", 
          requirements: "", 
          expires_at: "" 
        });
        setCompanySearchQuery("");
        setSelectedCompanyName("");
        setShowCreateForm(false);
        showSuccess("Вакансия создана", `Вакансия "${newVacancy.title}" успешно создана`);
      } else {
        const errorData = await response.json();
        showError("Ошибка создания", errorData.detail || "Не удалось создать вакансию");
      }
    } catch (error) {
      console.error("Error creating vacancy:", error);
      showError("Ошибка соединения", "Не удалось подключиться к серверу");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCompanyFilter = (companyId: number | null) => {
    setSelectedCompanyId(companyId);
    fetchVacancies(companyId || undefined);
  };

  // Company suggestion functions
  const fetchCompanySuggestions = async (query: string) => {
    if (query.length < 1) {
      setCompanySuggestions([]);
      setShowCompanySuggestions(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/v1/ats/hr/companies/suggest?q=${encodeURIComponent(query)}&limit=10`), {
        credentials: "include",
      });

      if (response.ok) {
        const suggestions = await response.json();
        setCompanySuggestions(suggestions);
        setShowCompanySuggestions(true);
      }
    } catch (error) {
      console.error("Error fetching company suggestions:", error);
    }
  };

  const fetchFilterSuggestions = async (query: string) => {
    if (query.length < 1) {
      setFilterSuggestions([]);
      setShowFilterSuggestions(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/v1/ats/hr/companies/suggest?q=${encodeURIComponent(query)}&limit=10`), {
        credentials: "include",
      });

      if (response.ok) {
        const suggestions = await response.json();
        setFilterSuggestions(suggestions);
        setShowFilterSuggestions(true);
      }
    } catch (error) {
      console.error("Error fetching filter suggestions:", error);
    }
  };

  const handleCompanySelect = (company: CompanySuggestion) => {
    setFormData(prev => ({ ...prev, company_id: company.id.toString() }));
    setSelectedCompanyName(company.name);
    setCompanySearchQuery(company.name);
    setShowCompanySuggestions(false);
  };

  const handleFilterSelect = (company: CompanySuggestion) => {
    // Check if company is already selected
    const isAlreadySelected = selectedFilterCompanies.some(c => c.id === company.id);
    
    if (!isAlreadySelected) {
      const newSelectedCompanies = [...selectedFilterCompanies, company];
      setSelectedFilterCompanies(newSelectedCompanies);
      setFilterSearchQuery("");
      setShowFilterSuggestions(false);
      
      // Filter vacancies by selected companies
      const companyIds = newSelectedCompanies.map(c => c.id);
      fetchVacanciesByCompanies(companyIds);
    }
  };

  const removeFilterCompany = (companyId: number) => {
    const newSelectedCompanies = selectedFilterCompanies.filter(c => c.id !== companyId);
    setSelectedFilterCompanies(newSelectedCompanies);
    
    if (newSelectedCompanies.length === 0) {
      // If no companies selected, show all vacancies
      fetchVacancies();
    } else {
      // Filter by remaining companies
      const companyIds = newSelectedCompanies.map(c => c.id);
      fetchVacanciesByCompanies(companyIds);
    }
  };

  const clearAllFilters = () => {
    setSelectedFilterCompanies([]);
    setFilterSearchQuery("");
    fetchVacancies();
  };

  const resetCreateForm = () => {
    setFormData({ 
      company_id: "", 
      title: "", 
      description: "", 
      requirements: "", 
      expires_at: "" 
    });
    setCompanySearchQuery("");
    setSelectedCompanyName("");
    setShowCompanySuggestions(false);
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

    setIsSubmitting(true);
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
        showSuccess("Вакансия обновлена", `Вакансия "${updatedVacancy.title}" успешно обновлена`);
      } else {
        const errorData = await response.json();
        showError("Ошибка обновления", errorData.detail || "Не удалось обновить вакансию");
      }
    } catch (error) {
      console.error("Error updating vacancy:", error);
      showError("Ошибка соединения", "Не удалось подключиться к серверу");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-600 text-green-100";
      case "Closed":
        return "bg-red-600 text-red-100";
      case "On Review":
        return "bg-yellow-600 text-yellow-100";
      default:
        return "bg-gray-600 text-gray-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "Active":
        return "Активна";
      case "Closed":
        return "Закрыта";
      case "On Review":
        return "На рассмотрении";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <main className="vacancies-loading">
        <div className="vacancies-loading-spinner">
          <div className="spinner"></div>
          <p>Загрузка...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Navbar currentPath="/cabinet/my-vacancies" />
      <main className="vacancies-container">
        <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="vacancies-header">
          <div>
            <h1 className="vacancies-title">Мои вакансии</h1>
            <p className="vacancies-subtitle">Управление вашими вакансиями</p>
          </div>
          <div className="vacancies-actions">
            <button
              onClick={() => navigate("/cabinet")}
              className="vacancies-back-button"
            >
              Назад в кабинет
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="vacancies-create-button"
            >
              Создать вакансию
            </button>
          </div>
        </header>

        {/* Company Filter */}
        <div className="vacancies-filter">
          <div className="vacancies-filter-content">
            <label className="vacancies-filter-label">Фильтр по компаниям:</label>
            <div className="vacancies-filter-input-container">
              {/* Selected Companies Chips */}
              {selectedFilterCompanies.length > 0 && (
                <div className="vacancies-filter-chips">
                  {selectedFilterCompanies.map((company) => (
                    <div key={company.id} className="vacancies-filter-chip">
                      <span>{company.name}</span>
                      <button
                        onClick={() => removeFilterCompany(company.id)}
                        className="vacancies-filter-chip-remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={clearAllFilters}
                    className="vacancies-filter-clear"
                  >
                    Очистить все
                  </button>
                </div>
              )}
              
              {/* Search Input */}
              <div className="vacancies-filter-input-wrapper">
                <SuggestionDropdown
                  value={filterSearchQuery}
                  onChange={(value) => {
                    setFilterSearchQuery(value);
                    fetchFilterSuggestions(value);
                  }}
                  onSelect={handleFilterSelect}
                  suggestions={filterSuggestions.filter(company => !selectedFilterCompanies.some(selected => selected.id === company.id))}
                  showSuggestions={showFilterSuggestions}
                  onShowSuggestions={setShowFilterSuggestions}
                  placeholder="Поиск компаний для фильтрации..."
                  className="vacancies-filter-input"
                  inputRef={filterInputRef}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Create Vacancy Form Modal */}
        {showCreateForm && (
          <div className="vacancies-modal-overlay">
            <div className="vacancies-modal">
              <h2 className="vacancies-modal-title">Создать новую вакансию</h2>
              <form onSubmit={handleCreateVacancy}>
                <div className="vacancies-form-grid">
                  <div>
                    <label htmlFor="company_search" className="vacancies-form-label">
                      Компания *
                    </label>
                    <div className="vacancies-company-search">
                      <SuggestionDropdown
                        value={companySearchQuery}
                        onChange={(value) => {
                          setCompanySearchQuery(value);
                          fetchCompanySuggestions(value);
                        }}
                        onSelect={handleCompanySelect}
                        suggestions={companySuggestions}
                        showSuggestions={showCompanySuggestions}
                        onShowSuggestions={setShowCompanySuggestions}
                        placeholder="Поиск компании..."
                        className="vacancies-company-search"
                        inputRef={companyInputRef}
                      />
                    </div>
                    {selectedCompanyName && (
                      <div className="vacancies-company-selected">
                        ✓ Выбрано: {selectedCompanyName}
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="expires_at" className="vacancies-form-label">
                      Дата окончания
                    </label>
                    <input
                      type="datetime-local"
                      id="expires_at"
                      name="expires_at"
                      value={formData.expires_at}
                      onChange={handleInputChange}
                      className="vacancies-form-input"
                    />
                  </div>
                </div>
                <div className="vacancies-form-group">
                  <label htmlFor="title" className="vacancies-form-label">
                    Название вакансии *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="vacancies-form-input"
                    placeholder="Введите название вакансии"
                  />
                </div>
                <div className="vacancies-form-group">
                  <label htmlFor="description" className="vacancies-form-label">
                    Описание вакансии
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="vacancies-form-textarea"
                    placeholder="Описание вакансии"
                  />
                </div>
                <div className="vacancies-form-group">
                  <label htmlFor="requirements" className="vacancies-form-label">
                    Требования
                  </label>
                  <textarea
                    id="requirements"
                    name="requirements"
                    value={formData.requirements}
                    onChange={handleInputChange}
                    rows={3}
                    className="vacancies-form-textarea"
                    placeholder="Требования к кандидату"
                  />
                </div>
                <div className="vacancies-form-actions">
                  <button
                    type="button"
                    onClick={() => {
                      resetCreateForm();
                      setShowCreateForm(false);
                    }}
                    className="vacancies-form-button cancel"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="vacancies-form-button submit"
                  >
                    {isSubmitting ? "Создание..." : "Создать"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Vacancies List */}
        {vacancies.length === 0 ? (
          <div className="vacancies-empty">
            <div className="vacancies-empty-icon">💼</div>
            <h3 className="vacancies-empty-title">У вас пока нет вакансий</h3>
            <p className="vacancies-empty-description">Создайте свою первую вакансию, чтобы начать работу</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="vacancies-empty-button"
            >
              Создать первую вакансию
            </button>
          </div>
        ) : (
          <div className="vacancies-grid">
            {vacancies.map((vacancy) => (
              <div key={vacancy.id} className="vacancies-card">
                <div className="vacancies-card-header">
                  <div className="vacancies-card-content">
                    <h3 className="vacancies-card-title">{vacancy.title}</h3>
                    <p className="vacancies-card-company">{vacancy.company_name}</p>
                    <span className={`vacancies-card-status ${vacancy.status.toLowerCase().replace(' ', '-')}`}>
                      {getStatusText(vacancy.status)}
                    </span>
                  </div>
                  <span className="vacancies-card-date">
                    {new Date(vacancy.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                
                {vacancy.description && (
                  <p className="vacancies-card-description">{vacancy.description}</p>
                )}
                
                {vacancy.requirements && (
                  <div className="vacancies-card-requirements">
                    <p className="vacancies-card-requirements-title">Требования:</p>
                    <p className="vacancies-card-requirements-text">{vacancy.requirements}</p>
                  </div>
                )}
                
                {vacancy.expires_at && (
                  <p className="vacancies-card-expires">
                    Истекает: {new Date(vacancy.expires_at).toLocaleDateString('ru-RU')}
                  </p>
                )}
                
                <div className="vacancies-card-actions">
                  <button 
                    onClick={() => startEditingVacancy(vacancy)}
                    className="vacancies-card-button edit"
                  >
                    Редактировать
                  </button>
                  <button className="vacancies-card-button view">
                    Просмотр
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Vacancy Modal */}
        {editingVacancy && (
          <div className="vacancies-modal-overlay">
            <div className="vacancies-modal">
              <h2 className="vacancies-modal-title">Редактировать вакансию</h2>
              <form onSubmit={updateVacancy}>
                <div className="vacancies-form-group">
                  <label htmlFor="edit_title" className="vacancies-form-label">
                    Название вакансии *
                  </label>
                  <input
                    type="text"
                    id="edit_title"
                    name="title"
                    value={editFormData.title}
                    onChange={handleEditInputChange}
                    required
                    className="vacancies-form-input"
                    placeholder="Введите название вакансии"
                  />
                </div>
                
                <div className="vacancies-form-group">
                  <label htmlFor="edit_description" className="vacancies-form-label">
                    Описание вакансии
                  </label>
                  <textarea
                    id="edit_description"
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditInputChange}
                    rows={3}
                    className="vacancies-form-textarea"
                    placeholder="Описание вакансии"
                  />
                </div>
                
                <div className="vacancies-form-group">
                  <label htmlFor="edit_requirements" className="vacancies-form-label">
                    Требования
                  </label>
                  <textarea
                    id="edit_requirements"
                    name="requirements"
                    value={editFormData.requirements}
                    onChange={handleEditInputChange}
                    rows={3}
                    className="vacancies-form-textarea"
                    placeholder="Требования к кандидату"
                  />
                </div>
                
                <div className="vacancies-form-group">
                  <label htmlFor="edit_expires_at" className="vacancies-form-label">
                    Дата окончания
                  </label>
                  <input
                    type="datetime-local"
                    id="edit_expires_at"
                    name="expires_at"
                    value={editFormData.expires_at}
                    onChange={handleEditInputChange}
                    className="vacancies-form-input"
                  />
                </div>
                
                <div className="vacancies-form-actions">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="vacancies-form-button cancel"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="vacancies-form-button submit"
                  >
                    {isSubmitting ? "Обновление..." : "Обновить"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      </main>
    </>
  );
}
