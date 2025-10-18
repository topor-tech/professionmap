import type { Route } from "./+types/my-companies";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { getApiUrl } from "../utils/api";
import { Navbar } from "../components/Navbar";
import "./my-companies.css";
import { useToast } from "../components/ToastProvider";
import { SuggestionDropdown, type SuggestionItem } from "../components/SuggestionDropdown";
import "../components/SuggestionDropdown.css";

interface UserInfoResponse {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  telegram: string | null;
}

interface UserSuggestion extends SuggestionItem {
  telegram: string | null;
}

interface Company {
  id: number;
  name: string;
  public_description: string | null;
  created_at: string;
  hr_user: UserInfoResponse[];
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Мои компании - ProfessionMap ATS" },
    { name: "description", content: "Управление компаниями в системе управления вакансиями" },
  ];
}

export default function MyCompanies() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    public_description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [userFormData, setUserFormData] = useState({
    email: "",
    name: "",
    password: "",
    phone: "",
    telegram: ""
  });
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
  const [userFormMode, setUserFormMode] = useState<"create" | "add">("create");
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    company_id: 0,
    name: "",
    public_description: ""
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

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
        showSuccess("Компания создана", `Компания "${newCompany.name}" успешно создана`);
      } else {
        const errorData = await response.json();
        showError("Ошибка создания", errorData.detail || "Не удалось создать компанию");
      }
    } catch (error) {
      console.error("Error creating company:", error);
      showError("Ошибка соединения", "Не удалось подключиться к серверу");
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

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddUser = (companyId: number) => {
    setSelectedCompanyId(companyId);
    setShowAddUserForm(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditFormData({
      company_id: company.id,
      name: company.name,
      public_description: company.public_description || ""
    });
    setShowEditForm(true);
  };

  const handleEditCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEdit(true);

    try {
      const response = await fetch(getApiUrl("/api/v1/ats/hr/edit_company"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        const updatedCompany = await response.json();
        setCompanies(companies.map(company => 
          company.id === updatedCompany.id ? updatedCompany : company
        ));
        setShowEditForm(false);
        showSuccess("Компания обновлена", `Компания "${updatedCompany.name}" успешно обновлена`);
      } else {
        const errorData = await response.json();
        showError("Ошибка обновления", errorData.detail || "Не удалось обновить компанию");
      }
    } catch (error) {
      console.error("Error updating company:", error);
      showError("Ошибка соединения", "Не удалось подключиться к серверу");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserSuggestions([]);
      setShowUserSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        getApiUrl(`/api/v1/ats/hr/users/suggest?q=${encodeURIComponent(query)}&limit=10`),
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const suggestions = await response.json();
        setUserSuggestions(suggestions);
        setShowUserSuggestions(true);
      } else {
        console.error("Error searching users:", response.statusText);
        setUserSuggestions([]);
        setShowUserSuggestions(false);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setUserSuggestions([]);
      setShowUserSuggestions(false);
    }
  };

  const handleUserSearchChange = (query: string) => {
    setUserSearchQuery(query);
    searchUsers(query);
  };

  const selectUser = (user: SuggestionItem) => {
    const userSuggestion = user as UserSuggestion;
    setSelectedUser(userSuggestion);
    setUserSearchQuery(`${userSuggestion.name} (${userSuggestion.email})`);
    setShowUserSuggestions(false);
    setUserFormMode("add");
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingUser(true);

    try {
      if (userFormMode === "add" && selectedUser && selectedCompanyId) {
        // Add existing user to company
        const response = await fetch(getApiUrl("/api/v1/ats/hr/companies/add_user"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            user_id: selectedUser.id,
            company_id: selectedCompanyId
          }),
        });

        if (response.ok) {
          const result = await response.json();
          showSuccess("Пользователь добавлен", result.message);
          setUserFormData({
            email: "",
            name: "",
            password: "",
            phone: "",
            telegram: ""
          });
          setUserSearchQuery("");
          setSelectedUser(null);
          setShowAddUserForm(false);
          setSelectedCompanyId(null);
          setUserFormMode("create");
          fetchCompanies(); // Refresh companies list
        } else {
          const errorData = await response.json();
          showError("Ошибка добавления", errorData.detail || "Не удалось добавить пользователя");
        }
      } else {
        // Create new user
        const response = await fetch(getApiUrl("/api/v1/ats/auth/create_user"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            ...userFormData,
            roles: ["hr"],
            company_id: selectedCompanyId
          }),
        });

        if (response.ok) {
          const newUser = await response.json();
          showSuccess("Пользователь создан", `Пользователь ${newUser.name} успешно создан с ролью HR`);
          setUserFormData({
            email: "",
            name: "",
            password: "",
            phone: "",
            telegram: ""
          });
          setUserSearchQuery("");
          setSelectedUser(null);
          setShowAddUserForm(false);
          setSelectedCompanyId(null);
          setUserFormMode("create");
          fetchCompanies(); // Refresh companies list
        } else {
          const errorData = await response.json();
          showError("Ошибка создания", errorData.detail || "Не удалось создать пользователя");
        }
      }
    } catch (error) {
      console.error("Error handling user:", error);
      showError("Ошибка соединения", "Не удалось подключиться к серверу");
    } finally {
      setIsSubmittingUser(false);
    }
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
    <>
      <Navbar currentPath="/cabinet/my-companies" />
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

        {/* Edit Company Form Modal */}
        {showEditForm && (
          <div className="companies-modal-overlay">
            <div className="companies-modal">
              <h2 className="companies-modal-title">Редактировать компанию</h2>
              <form onSubmit={handleEditCompanySubmit}>
                <div className="companies-form-group">
                  <label htmlFor="edit-name" className="companies-form-label">
                    Название компании *
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    required
                    className="companies-form-input"
                    placeholder="Введите название компании"
                  />
                </div>
                <div className="companies-form-group">
                  <label htmlFor="edit-public_description" className="companies-form-label">
                    Описание компании
                  </label>
                  <textarea
                    id="edit-public_description"
                    name="public_description"
                    value={editFormData.public_description}
                    onChange={handleEditInputChange}
                    rows={3}
                    className="companies-form-textarea"
                    placeholder="Краткое описание компании"
                  />
                </div>
                <div className="companies-form-actions">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="companies-form-button cancel"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="companies-form-button submit"
                  >
                    {isSubmittingEdit ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add User Form Modal */}
        {showAddUserForm && (
          <div className="companies-modal-overlay">
            <div className="companies-modal">
              <h2 className="companies-modal-title">Добавить коллегу с ролью HR</h2>
              
              {/* User Search Section */}
              <div className="companies-form-group">
                <label htmlFor="user-search" className="companies-form-label">
                  Поиск существующего пользователя
                </label>
                <div className="companies-user-search-container">
                  <SuggestionDropdown
                    value={userSearchQuery}
                    onChange={handleUserSearchChange}
                    onSelect={selectUser}
                    suggestions={userSuggestions}
                    showSuggestions={showUserSuggestions}
                    onShowSuggestions={setShowUserSuggestions}
                    placeholder="Введите имя, email или telegram для поиска"
                    className="companies-user-search"
                  />
                </div>
              </div>

              {userFormMode === "add" && selectedUser && (
                <div className="companies-selected-user">
                  <p>Выбран пользователь: <strong>{selectedUser.name}</strong> ({selectedUser.email})</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserSearchQuery("");
                      setUserFormMode("create");
                    }}
                    className="companies-form-button cancel"
                  >
                    Выбрать другого
                  </button>
                </div>
              )}

              <form onSubmit={handleCreateUser}>
                {userFormMode === "create" && (
                  <>
                    <div className="companies-form-group">
                      <label htmlFor="user-email" className="companies-form-label">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="user-email"
                        name="email"
                        value={userFormData.email}
                        onChange={handleUserInputChange}
                        required
                        className="companies-form-input"
                        placeholder="Введите email коллеги"
                      />
                    </div>
                    <div className="companies-form-group">
                      <label htmlFor="user-name" className="companies-form-label">
                        Имя *
                      </label>
                      <input
                        type="text"
                        id="user-name"
                        name="name"
                        value={userFormData.name}
                        onChange={handleUserInputChange}
                        required
                        className="companies-form-input"
                        placeholder="Введите имя коллеги"
                      />
                    </div>
                    <div className="companies-form-group">
                      <label htmlFor="user-password" className="companies-form-label">
                        Пароль *
                      </label>
                      <input
                        type="password"
                        id="user-password"
                        name="password"
                        value={userFormData.password}
                        onChange={handleUserInputChange}
                        required
                        className="companies-form-input"
                        placeholder="Введите пароль для коллеги"
                      />
                    </div>
                    <div className="companies-form-group">
                      <label htmlFor="user-phone" className="companies-form-label">
                        Телефон
                      </label>
                      <input
                        type="tel"
                        id="user-phone"
                        name="phone"
                        value={userFormData.phone}
                        onChange={handleUserInputChange}
                        className="companies-form-input"
                        placeholder="Введите телефон коллеги"
                      />
                    </div>
                    <div className="companies-form-group">
                      <label htmlFor="user-telegram" className="companies-form-label">
                        Telegram
                      </label>
                      <input
                        type="text"
                        id="user-telegram"
                        name="telegram"
                        value={userFormData.telegram}
                        onChange={handleUserInputChange}
                        className="companies-form-input"
                        placeholder="Введите Telegram коллеги"
                      />
                    </div>
                  </>
                )}
                <div className="companies-form-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUserForm(false);
                      setSelectedCompanyId(null);
                      setUserFormData({
                        email: "",
                        name: "",
                        password: "",
                        phone: "",
                        telegram: ""
                      });
                      setUserSearchQuery("");
                      setSelectedUser(null);
                      setUserFormMode("create");
                      setShowUserSuggestions(false);
                      setUserSuggestions([]);
                    }}
                    className="companies-form-button cancel"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingUser}
                    className="companies-form-button submit"
                  >
                    {isSubmittingUser 
                      ? (userFormMode === "add" ? "Добавление..." : "Создание...") 
                      : (userFormMode === "add" ? "Добавить" : "Создать")
                    }
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
                
                {/* HR Admins Section */}
                <div className="companies-card-hr-section">
                  <h4 className="companies-card-hr-title">HR ({company.hr_user?.length || 0})</h4>
                  {company.hr_user && company.hr_user.length > 0 ? (
                    company.hr_user.map((hrUser) => (
                      <div key={hrUser.id} className="companies-card-hr-user">
                        <div className="companies-card-hr-user-info">
                          <span className="companies-card-hr-user-name">{hrUser.name}</span>
                          <span className="companies-card-hr-user-email">{hrUser.email}</span>
                        </div>
                        {hrUser.telegram && (
                          <span className="companies-card-hr-user-telegram">@{hrUser.telegram}</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="companies-card-hr-empty">Нет HR</p>
                  )}
                </div>
                
                <div className="companies-card-actions">
                  <button 
                    className="companies-card-button manage"
                    onClick={() => handleEditCompany(company)}
                  >
                    Редактировать
                  </button>
                  <button 
                    className="companies-card-button settings"
                    onClick={() => handleAddUser(company.id)}
                  >
                    Добавить коллегу
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </main>
    </>
  );
}
