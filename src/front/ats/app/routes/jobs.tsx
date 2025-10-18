import { useState, useEffect } from "react";
import type { Route } from "./+types/jobs";
import { Link, useSearchParams, useNavigate } from "react-router";
import { getApiUrl } from "../utils/api";
import { useToast } from "../components/ToastProvider";
import "./jobs.css";

interface Vacancy {
  id: number;
  company_id: number;
  title: string;
  description: string | null;
  requirements: string | null;
  created_at: string;
  company_name: string;
  link: string;
}

interface Company {
  id: number;
  name: string;
  public_description: string | null;
}

interface UserInfo {
  id: number;
  email: string;
  name: string;
  phone?: string;
  telegram?: string;
  roles: string[];
}

interface ApplicationFormData {
  email: string;
  phone: string;
  telegram: string;
  name: string;
  password: string;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Поиск вакансий - ProfessionMap ATS" },
    { name: "description", content: "Найдите подходящую работу с помощью удобного поиска и фильтров" },
  ];
}

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");
  const [selectedCompanies, setSelectedCompanies] = useState<Company[]>([]);
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [totalPages, setTotalPages] = useState(1);
  const [totalVacancies, setTotalVacancies] = useState(0);
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [respondingVacancies, setRespondingVacancies] = useState<Set<number>>(new Set());
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVacancyId, setSelectedVacancyId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ApplicationFormData>({
    email: '',
    phone: '',
    telegram: '',
    name: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const itemsPerPage = 10;

  // Function to update URL with current filters
  const updateURL = (updates: { search?: string; page?: number; companies?: string }) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (updates.search !== undefined) {
      if (updates.search) {
        newParams.set('search', updates.search);
      } else {
        newParams.delete('search');
      }
    }
    
    if (updates.page !== undefined) {
      if (updates.page > 1) {
        newParams.set('page', updates.page.toString());
      } else {
        newParams.delete('page');
      }
    }
    
    if (updates.companies !== undefined) {
      if (updates.companies) {
        newParams.set('companies', updates.companies);
      } else {
        newParams.delete('companies');
      }
    }
    
    setSearchParams(newParams);
  };

  // Initialize selected companies from URL params
  useEffect(() => {
    const companiesParam = searchParams.get('companies');
    if (companiesParam) {
      const companyIds = companiesParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (companyIds.length > 0) {
        // Store company IDs for later use when companies are loaded
        const storedCompanyIds = companyIds;
        
        // We'll set the companies when the main companies list is loaded
        const checkAndSetCompanies = () => {
          if (companies.length > 0) {
            const validCompanies = companies.filter(c => storedCompanyIds.includes(c.id));
            setSelectedCompanies(validCompanies);
          }
        };
        
        checkAndSetCompanies();
      }
    }
  }, [searchParams, companies]);

  // Check user authentication
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch(getApiUrl("/api/v1/ats/auth/user_info"), {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setUserInfo(data);
        } else {
          setUserInfo(null);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        setUserInfo(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserInfo();
  }, []);

  // Fetch companies for filter dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        // Use the new companies suggest API with a default search term
        const response = await fetch(getApiUrl('/api/v1/ats/feed/companies/suggest?q=&limit=4'));
        if (response.ok) {
          const data = await response.json();
          setCompanies(data);
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
      }
    };

    fetchCompanies();
  }, []);

  // Fetch companies based on search term
  useEffect(() => {
    const fetchCompaniesBySearch = async () => {
      if (companySearchTerm.length < 1) {
        // If search term is empty, fetch all companies
        const response = await fetch(getApiUrl('/api/v1/ats/feed/companies/suggest?q=&limit=4'));
        if (response.ok) {
          const data = await response.json();
          setCompanies(data);
        }
        return;
      }

      try {
        const response = await fetch(getApiUrl(`/api/v1/ats/feed/companies/suggest?q=${encodeURIComponent(companySearchTerm)}&limit=4`));
        if (response.ok) {
          const data = await response.json();
          setCompanies(data);
        }
      } catch (err) {
        console.error('Error fetching companies:', err);
      }
    };

    const timeoutId = setTimeout(fetchCompaniesBySearch, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [companySearchTerm]);

  // Fetch vacancies with filters
  useEffect(() => {
    const fetchVacancies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const offset = (currentPage - 1) * itemsPerPage;
        let url = `${getApiUrl('/api/v1/ats/feed/vacancies')}?limit=${itemsPerPage}&offset=${offset}`;
        
        if (selectedCompanies.length > 0) {
          const companyIds = selectedCompanies.map(company => company.id).join(',');
          url += `&company_id=${companyIds}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setVacancies(data);
        
        // For simplicity, we'll estimate total pages based on current data
        // In a real app, you'd get this from the API response
        setTotalPages(Math.ceil(data.length / itemsPerPage));
        setTotalVacancies(data.length);
      } catch (err) {
        console.error('Error fetching vacancies:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch vacancies');
      } finally {
        setLoading(false);
      }
    };

    fetchVacancies();
  }, [currentPage, selectedCompanies]);

  // Filter vacancies by search term
  const filteredVacancies = vacancies.filter(vacancy => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      vacancy.title.toLowerCase().includes(searchLower) ||
      vacancy.company_name.toLowerCase().includes(searchLower) ||
      (vacancy.description && vacancy.description.toLowerCase().includes(searchLower)) ||
      (vacancy.requirements && vacancy.requirements.toLowerCase().includes(searchLower))
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    updateURL({ search: value, page: 1 });
  };

  const handleCompanySelect = (company: Company) => {
    if (!selectedCompanies.find(c => c.id === company.id)) {
      const newSelectedCompanies = [...selectedCompanies, company];
      setSelectedCompanies(newSelectedCompanies);
      const companyIds = newSelectedCompanies.map(c => c.id).join(',');
      updateURL({ companies: companyIds, page: 1 });
    }
    setCompanySearchTerm("");
    setShowCompanyDropdown(false);
  };

  const handleCompanyRemove = (companyId: number) => {
    const newSelectedCompanies = selectedCompanies.filter(c => c.id !== companyId);
    setSelectedCompanies(newSelectedCompanies);
    const companyIds = newSelectedCompanies.map(c => c.id).join(',');
    updateURL({ companies: companyIds || undefined, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCompanySearchTerm("");
    setSelectedCompanies([]);
    setCurrentPage(1);
    updateURL({ search: undefined, companies: undefined, page: 1 });
  };

  const handleRespondToVacancy = async (vacancyId: number) => {
    // If user is not authenticated, open modal for registration/response
    if (!userInfo) {
      setSelectedVacancyId(vacancyId);
      setIsModalOpen(true);
      return;
    }

    // Check if already responding to this vacancy
    if (respondingVacancies.has(vacancyId)) {
      return;
    }

    // Add to responding set
    setRespondingVacancies(prev => new Set(prev).add(vacancyId));

    try {
      const response = await fetch(getApiUrl('/api/v1/ats/candidate/respond'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include authentication cookies
        body: JSON.stringify({ vacancy_id: vacancyId }),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess("Отклик отправлен", data.message || "Ваш отклик успешно отправлен!");
      } else {
        const errorData = await response.json();
        if (response.status === 401) {
          showError("Требуется авторизация", "Пожалуйста, войдите в систему для отправки отклика");
          navigate("/candidate_login");
        } else if (response.status === 403) {
          showError("Доступ запрещен", "Для отправки откликов требуется роль кандидата");
        } else if (response.status === 400) {
          showError("Ошибка", errorData.detail || "Не удалось отправить отклик");
        } else {
          showError("Ошибка", errorData.detail || "Произошла ошибка при отправке отклика");
        }
      }
    } catch (error) {
      console.error('Error responding to vacancy:', error);
      showError("Ошибка соединения", "Не удалось подключиться к серверу");
    } finally {
      // Remove from responding set
      setRespondingVacancies(prev => {
        const newSet = new Set(prev);
        newSet.delete(vacancyId);
        return newSet;
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancyId) return;

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const response = await fetch(getApiUrl('/api/v1/ats/candidate/respond_no_login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vacancy_id: selectedVacancyId,
          email: formData.email,
          phone: formData.phone || null,
          telegram: formData.telegram || null,
          name: formData.name,
          password: formData.password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit application');
      }

      const result = await response.json();
      setSubmitMessage({ type: 'success', text: result.message });
      
      // Close modal after successful submission
      setTimeout(() => {
        setIsModalOpen(false);
        setFormData({ email: '', phone: '', telegram: '', name: '', password: '' });
        setSubmitMessage(null);
        setSelectedVacancyId(null);
        showSuccess("Отклик отправлен", result.message || "Ваш отклик успешно отправлен!");
      }, 2000);

    } catch (error) {
      console.error('Error submitting application:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to submit application' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ email: '', phone: '', telegram: '', name: '', password: '' });
    setSubmitMessage(null);
    setSelectedVacancyId(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.company-search-container')) {
        setShowCompanyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <main className="jobs-container">
      <div className="jobs-content">
        <header className="jobs-header">
          <h1 className="jobs-title">Поиск вакансий</h1>
          <p className="jobs-subtitle">
            Найдите подходящую работу с помощью удобного поиска и фильтров
          </p>
        </header>

        {/* Search and Filters */}
        <div className="jobs-filters">
          <div className="search-section">
            <div className="search-input-container">
              <input
                type="text"
                placeholder="Поиск по названию, компании, описанию..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
              />
              <div className="search-icon">🔍</div>
            </div>
          </div>

          <div className="filters-section">
            <div className="filter-group">
              <label htmlFor="company-search" className="filter-label">
                Компания:
              </label>
              <div className="company-search-container">
                <input
                  type="text"
                  id="company-search"
                  placeholder="Введите название компании..."
                  value={companySearchTerm}
                  onChange={(e) => {
                    setCompanySearchTerm(e.target.value);
                    setShowCompanyDropdown(true);
                  }}
                  onFocus={() => setShowCompanyDropdown(true)}
                  className="search-input"
                />
                {showCompanyDropdown && (
                  <div className="company-dropdown">
                    {companies.length > 0 ? (
                      companies.slice(0, 4).map(company => (
                        <div
                          key={company.id}
                          className="company-option"
                          onClick={() => handleCompanySelect(company)}
                        >
                          <div className="company-option-name">{company.name}</div>
                          {company.public_description && (
                            <div className="company-option-description">
                              {company.public_description}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="company-option no-results">
                        Компании не найдены
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={clearFilters}
              className="clear-filters-btn"
            >
              Очистить
            </button>
          </div>

          {/* Selected Companies Chips */}
          {selectedCompanies.length > 0 && (
            <div className="selected-companies">
              <div className="selected-companies-label">Выбранные компании:</div>
              <div className="company-chips">
                {selectedCompanies.map(company => (
                  <div key={company.id} className="company-chip">
                    <span className="company-chip-name">{company.name}</span>
                    <button
                      type="button"
                      className="company-chip-remove"
                      onClick={() => handleCompanyRemove(company.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="results-summary">
          <p className="results-text">
            Найдено вакансий: {filteredVacancies.length}
            {selectedCompanies.length > 0 && (
              <span className="filter-info">
                {" "}(фильтр по компаниям: {selectedCompanies.map(c => c.name).join(", ")})
              </span>
            )}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Загрузка вакансий...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-container">
            <p className="error-text">
              Ошибка загрузки: {error}
            </p>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredVacancies.length === 0 && (
          <div className="no-results-container">
            <p className="no-results-text">
              {searchTerm || selectedCompanies.length > 0
                ? "По вашему запросу ничего не найдено. Попробуйте изменить параметры поиска."
                : "Пока нет доступных вакансий"
              }
            </p>
          </div>
        )}

        {/* Vacancies List */}
        {!loading && !error && filteredVacancies.length > 0 && (
          <div className="vacancies-list">
            {filteredVacancies.map((vacancy) => (
              <div key={vacancy.id} className="vacancy-card">
                <div className="vacancy-header">
                  <div className="vacancy-title-section">
                    <h3 className="vacancy-title">
                      <Link to={`/job_page/${vacancy.id}`} className="vacancy-title-link">
                        {vacancy.title}
                      </Link>
                    </h3>
                    <p className="vacancy-company">{vacancy.company_name}</p>
                  </div>
                  <span className="vacancy-date">
                    {formatDate(vacancy.created_at)}
                  </span>
                </div>
                
                {vacancy.description && (
                  <div className="vacancy-description">
                    <p className="description-text">
                      {vacancy.description.length > 200 
                        ? `${vacancy.description.substring(0, 200)}...`
                        : vacancy.description
                      }
                    </p>
                  </div>
                )}
                
                {vacancy.requirements && (
                  <div className="vacancy-requirements">
                    <h4 className="requirements-title">Требования:</h4>
                    <p className="requirements-text">
                      {vacancy.requirements.length > 150 
                        ? `${vacancy.requirements.substring(0, 150)}...`
                        : vacancy.requirements
                      }
                    </p>
                  </div>
                )}
                
                <div className="vacancy-actions">
                  <Link
                    to={`/job_page/${vacancy.id}`}
                    className="view-details-btn"
                  >
                    Подробнее
                  </Link>
                  <button
                    onClick={() => handleRespondToVacancy(vacancy.id)}
                    className="apply-btn"
                    disabled={respondingVacancies.has(vacancy.id)}
                  >
                    {respondingVacancies.has(vacancy.id) ? "Отправка..." : "Откликнуться"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn prev-btn"
            >
              Назад
            </button>
            
            <div className="pagination-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn next-btn"
            >
              Вперед
            </button>
          </div>
        )}
      </div>

      {/* Application Modal for Unauthenticated Users */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Откликнуться на вакансию</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="application-form">
              <div className="form-group">
                <label htmlFor="name">Имя *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Введите ваше имя"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="Введите ваш email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Телефон</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Введите ваш телефон"
                />
              </div>

              <div className="form-group">
                <label htmlFor="telegram">Telegram</label>
                <input
                  type="text"
                  id="telegram"
                  name="telegram"
                  value={formData.telegram}
                  onChange={handleInputChange}
                  placeholder="Введите ваш Telegram"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Пароль *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Создайте пароль для входа"
                />
              </div>

              {submitMessage && (
                <div className={`submit-message ${submitMessage.type}`}>
                  {submitMessage.text}
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Отправка...' : 'Отправить отклик'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
