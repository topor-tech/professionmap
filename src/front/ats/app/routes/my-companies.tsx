import type { Route } from "./+types/my-companies";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { getApiUrl } from "../utils/api";

interface Company {
  id: number;
  name: string;
  public_description: string | null;
  created_at: string;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Мои компании - ProfessionMap ATS" },
    { name: "description", content: "Управление компаниями в системе управления вакансиями" },
  ];
}

export default function MyCompanies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    public_description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch(getApiUrl("/api/v1/ats/hr/companies"), {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      } else if (response.status === 401) {
        navigate("/login");
      } else {
        console.error("Error fetching companies:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(getApiUrl("/api/v1/ats/hr/create_company"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newCompany = await response.json();
        setCompanies([...companies, newCompany]);
        setFormData({ name: "", public_description: "" });
        setShowCreateForm(false);
      } else {
        const errorData = await response.json();
        alert(`Ошибка создания компании: ${errorData.detail || "Неизвестная ошибка"}`);
      }
    } catch (error) {
      console.error("Error creating company:", error);
      alert("Ошибка при создании компании");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
            <h1 className="text-3xl font-bold mb-2">Мои компании</h1>
            <p className="text-lg opacity-80">Управление вашими компаниями</p>
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
              Создать компанию
            </button>
          </div>
        </header>

        {/* Create Company Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">Создать новую компанию</h2>
              <form onSubmit={handleCreateCompany}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Название компании *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="Введите название компании"
                  />
                </div>
                <div className="mb-6">
                  <label htmlFor="public_description" className="block text-sm font-medium mb-2">
                    Описание компании
                  </label>
                  <textarea
                    id="public_description"
                    name="public_description"
                    value={formData.public_description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="Краткое описание компании"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
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

        {/* Companies List */}
        {companies.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold mb-2">У вас пока нет компаний</h3>
            <p className="text-gray-400 mb-6">Создайте свою первую компанию, чтобы начать работу</p>
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
              Создать первую компанию
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <div key={company.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">{company.name}</h3>
                  <span className="text-xs text-gray-400">
                    {new Date(company.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                {company.public_description && (
                  <p className="text-gray-300 mb-4 line-clamp-3">{company.public_description}</p>
                )}
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors">
                    Управление
                  </button>
                  <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors">
                    Настройки
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
