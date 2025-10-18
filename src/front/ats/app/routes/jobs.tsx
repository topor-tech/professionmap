import { useState, useEffect } from "react";
import type { Route } from "./+types/jobs";
import { Link } from "react-router";
import { getApiUrl } from "../utils/api";
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
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Поиск вакансий - ProfessionMap ATS" },
    { name: "description", content: "Найдите подходящую работу с помощью удобного поиска и фильтров" },
  ];
}

export default function Jobs() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVacancies, setTotalVacancies] = useState(0);
  
  const itemsPerPage = 10;

  // Fetch companies for filter dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch(getApiUrl('/api/v1/ats/hr/companies'));
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

  // Fetch vacancies with filters
  useEffect(() => {
    const fetchVacancies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const offset = (currentPage - 1) * itemsPerPage;
        let url = `${getApiUrl('/api/v1/ats/feed/vacancies')}?limit=${itemsPerPage}&offset=${offset}`;
        
        if (selectedCompany) {
          url += `&company_id=${selectedCompany}`;
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
  }, [currentPage, selectedCompany]);

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
    setSearchTerm(e.target.value);
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedCompany(value ? parseInt(value) : null);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCompany(null);
    setCurrentPage(1);
  };

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
              <label htmlFor="company-filter" className="filter-label">
                Компания:
              </label>
              <select
                id="company-filter"
                value={selectedCompany || ""}
                onChange={handleCompanyChange}
                className="company-select"
              >
                <option value="">Все компании</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={clearFilters}
              className="clear-filters-btn"
            >
              Очистить фильтры
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="results-summary">
          <p className="results-text">
            Найдено вакансий: {filteredVacancies.length}
            {selectedCompany && (
              <span className="filter-info">
                {" "}(фильтр по компании: {companies.find(c => c.id === selectedCompany)?.name})
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
              {searchTerm || selectedCompany 
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
                  <Link
                    to={`/apply?vacancy_id=${vacancy.id}`}
                    className="apply-btn"
                  >
                    Откликнуться
                  </Link>
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
    </main>
  );
}
