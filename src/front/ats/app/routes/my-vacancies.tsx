import type { Route } from "./+types/my-vacancies";
import { useNavigate } from "react-router";
import { useEffect, useState, useRef } from "react";
import { getApiUrl } from "../utils/api";

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

interface CompanySuggestion {
  id: number;
  name: string;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Мои вакансии - ProfessionMap ATS" },
    { name: "description", content: "Управление вакансиями в системе управления вакансиями" },
  ];
}

export default function MyVacancies() {
  const navigate = useNavigate();
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
      } else {
        const errorData = await response.json();
        alert(`Ошибка создания вакансии: ${errorData.detail || "Неизвестная ошибка"}`);
      }
    } catch (error) {
      console.error("Error creating vacancy:", error);
      alert("Ошибка при создании вакансии");
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
            <h1 className="text-3xl font-bold mb-2">Мои вакансии</h1>
            <p className="text-lg opacity-80">Управление вашими вакансиями</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/cabinet")}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-700 hover:bg-gray-600"
            >
              Назад в кабинет
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
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
              Создать вакансию
            </button>
          </div>
        </header>

        {/* Company Filter */}
        <div className="mb-6">
          <div className="flex gap-4 items-start flex-wrap">
            <label className="text-sm font-medium mt-2">Фильтр по компаниям:</label>
            <div className="flex-1 max-w-2xl">
              {/* Selected Companies Chips */}
              {selectedFilterCompanies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedFilterCompanies.map((company) => (
                    <div key={company.id} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">
                      <span>{company.name}</span>
                      <button
                        onClick={() => removeFilterCompany(company.id)}
                        className="ml-1 hover:bg-blue-700 rounded-full p-1 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={clearAllFilters}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
                  >
                    Очистить все
                  </button>
                </div>
              )}
              
              {/* Search Input */}
              <div className="relative">
                <input
                  ref={filterInputRef}
                  type="text"
                  value={filterSearchQuery}
                  onChange={(e) => {
                    setFilterSearchQuery(e.target.value);
                    fetchFilterSuggestions(e.target.value);
                  }}
                  onFocus={() => {
                    if (filterSearchQuery.length > 0) {
                      setShowFilterSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowFilterSuggestions(false), 200);
                  }}
                  placeholder="Поиск компаний для фильтрации..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
                {showFilterSuggestions && filterSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-lg mt-1 max-h-48 overflow-y-auto z-10">
                    {filterSuggestions
                      .filter(company => !selectedFilterCompanies.some(selected => selected.id === company.id))
                      .map((company) => (
                        <button
                          key={company.id}
                          onClick={() => handleFilterSelect(company)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors"
                        >
                          {company.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Vacancy Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Создать новую вакансию</h2>
              <form onSubmit={handleCreateVacancy}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="company_search" className="block text-sm font-medium mb-2">
                      Компания *
                    </label>
                    <div className="relative">
                      <input
                        ref={companyInputRef}
                        type="text"
                        id="company_search"
                        value={companySearchQuery}
                        onChange={(e) => {
                          setCompanySearchQuery(e.target.value);
                          fetchCompanySuggestions(e.target.value);
                        }}
                        onFocus={() => {
                          if (companySearchQuery.length > 0) {
                            setShowCompanySuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowCompanySuggestions(false), 200);
                        }}
                        placeholder="Поиск компании..."
                        required
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                      {showCompanySuggestions && companySuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-lg mt-1 max-h-48 overflow-y-auto z-20">
                          {companySuggestions.map((company) => (
                            <button
                              key={company.id}
                              type="button"
                              onClick={() => handleCompanySelect(company)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors"
                            >
                              {company.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedCompanyName && (
                      <div className="mt-2">
                        <span className="text-sm text-green-400">✓ Выбрано: {selectedCompanyName}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="expires_at" className="block text-sm font-medium mb-2">
                      Дата окончания
                    </label>
                    <input
                      type="datetime-local"
                      id="expires_at"
                      name="expires_at"
                      value={formData.expires_at}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label htmlFor="title" className="block text-sm font-medium mb-2">
                    Название вакансии *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="Введите название вакансии"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium mb-2">
                    Описание вакансии
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="Описание вакансии"
                  />
                </div>
                <div className="mb-6">
                  <label htmlFor="requirements" className="block text-sm font-medium mb-2">
                    Требования
                  </label>
                  <textarea
                    id="requirements"
                    name="requirements"
                    value={formData.requirements}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="Требования к кандидату"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      resetCreateForm();
                      setShowCreateForm(false);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: 'white'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                      }
                    }}
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
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💼</div>
            <h3 className="text-xl font-semibold mb-2">У вас пока нет вакансий</h3>
            <p className="text-gray-400 mb-6">Создайте свою первую вакансию, чтобы начать работу</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 rounded-lg font-medium transition-colors"
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
              Создать первую вакансию
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {vacancies.map((vacancy) => (
              <div key={vacancy.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{vacancy.title}</h3>
                    <p className="text-sm text-gray-400 mb-2">{vacancy.company_name}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vacancy.status)}`}>
                      {getStatusText(vacancy.status)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(vacancy.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                
                {vacancy.description && (
                  <p className="text-gray-300 mb-3 line-clamp-3">{vacancy.description}</p>
                )}
                
                {vacancy.requirements && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-400 mb-1">Требования:</p>
                    <p className="text-gray-300 text-sm line-clamp-2">{vacancy.requirements}</p>
                  </div>
                )}
                
                {vacancy.expires_at && (
                  <p className="text-sm text-gray-400 mb-3">
                    Истекает: {new Date(vacancy.expires_at).toLocaleDateString('ru-RU')}
                  </p>
                )}
                
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors">
                    Редактировать
                  </button>
                  <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors">
                    Просмотр
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
