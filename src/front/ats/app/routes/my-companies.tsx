import type { Route } from "./+types/my-companies";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { getApiUrl } from "../utils/api";
import "./my-companies.css";

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
      <main className="companies-loading">
        <div className="companies-loading-spinner">
          <div className="spinner"></div>
          <p>Загрузка...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="companies-container">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="companies-header">
          <div>
            <h1 className="companies-title">Мои компании</h1>
            <p className="companies-subtitle">Управление вашими компаниями</p>
          </div>
          <div className="companies-actions">
            <button
              onClick={() => navigate("/cabinet")}
              className="companies-back-button"
            >
              Назад в кабинет
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="companies-create-button"
            >
              Создать компанию
            </button>
          </div>
        </header>

        {/* Create Company Form Modal */}
        {showCreateForm && (
          <div className="companies-modal-overlay">
            <div className="companies-modal">
              <h2 className="companies-modal-title">Создать новую компанию</h2>
              <form onSubmit={handleCreateCompany}>
                <div className="companies-form-group">
                  <label htmlFor="name" className="companies-form-label">
                    Название компании *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="companies-form-input"
                    placeholder="Введите название компании"
                  />
                </div>
                <div className="companies-form-group">
                  <label htmlFor="public_description" className="companies-form-label">
                    Описание компании
                  </label>
                  <textarea
                    id="public_description"
                    name="public_description"
                    value={formData.public_description}
                    onChange={handleInputChange}
                    rows={3}
                    className="companies-form-textarea"
                    placeholder="Краткое описание компании"
                  />
                </div>
                <div className="companies-form-actions">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="companies-form-button cancel"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="companies-form-button submit"
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
          <div className="companies-empty">
            <div className="companies-empty-icon">🏢</div>
            <h3 className="companies-empty-title">У вас пока нет компаний</h3>
            <p className="companies-empty-description">Создайте свою первую компанию, чтобы начать работу</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="companies-empty-button"
            >
              Создать первую компанию
            </button>
          </div>
        ) : (
          <div className="companies-grid">
            {companies.map((company) => (
              <div key={company.id} className="companies-card">
                <div className="companies-card-header">
                  <h3 className="companies-card-title">{company.name}</h3>
                  <span className="companies-card-date">
                    {new Date(company.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                {company.public_description && (
                  <p className="companies-card-description">{company.public_description}</p>
                )}
                <div className="companies-card-actions">
                  <button className="companies-card-button manage">
                    Управление
                  </button>
                  <button className="companies-card-button settings">
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
