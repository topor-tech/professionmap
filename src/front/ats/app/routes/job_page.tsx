import type { Route } from "./+types/home";
import { useLoaderData, Link } from "react-router";
import { getApiUrl } from "../utils/api";
import { useState, useEffect } from "react";
import { CandidateNavbar } from "../components/CandidateNavbar";
import "./job_page.css";

interface VacancyInfo {
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

interface ApplicationFormData {
  email: string;
  phone: string;
  telegram: string;
  name: string;
  password: string;
}

interface ApplicationResponse {
  user_id: number;
  respond_id: number;
  message: string;
}

interface AuthenticatedApplicationResponse {
  respond_id: number;
  message: string;
}

interface UserInfo {
  id: number;
  email: string;
  name: string;
  phone?: string;
  telegram?: string;
  roles: string[];
}

export function meta({ params }: { params: { id: string } }) {
  return [
    { title: "Job Details - ProfessionMap ATS" },
    { name: "description", content: "Detailed job vacancy information" },
  ];
}

export async function loader({ params }: { params: { id: string } }) {
  const { id } = params;
  
  if (!id) {
    throw new Response("Job ID is required", { status: 400 });
  }

  try {
    const apiUrl = getApiUrl(`/api/v1/ats/feed/vacancies/${id}`);
    console.log(`Fetching job details from: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      if (response.status === 404) {
        throw new Response("Job not found", { status: 404 });
      }
      throw new Response("Failed to fetch job details", { status: response.status });
    }
    
    const vacancyInfo: VacancyInfo = await response.json();
    return { vacancyInfo };
  } catch (error) {
    console.error("Error fetching job details:", error);
    throw new Response("Failed to load job details", { status: 500 });
  }
}

export default function JobPage() {
  const { vacancyInfo } = useLoaderData<typeof loader>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<ApplicationFormData>({
    email: '',
    phone: '',
    telegram: '',
    name: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      let response;
      
      if (userInfo) {
        // User is authenticated, use the authenticated endpoint
        const apiUrl = getApiUrl('/api/v1/ats/candidate/respond');
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            vacancy_id: vacancyInfo.id
          })
        });
      } else {
        // User is not authenticated, use the no-login endpoint
        const apiUrl = getApiUrl('/api/v1/ats/candidate/respond_no_login');
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vacancy_id: vacancyInfo.id,
            email: formData.email,
            phone: formData.phone || null,
            telegram: formData.telegram || null,
            name: formData.name,
            password: formData.password
          })
        });
      }

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
  };

  return (
    <main className="job-page-container">
      <CandidateNavbar allowUnauthenticated={true} />
      <div className="job-page-content">
        {/* Header */}
        <header className="job-page-header">
          <div className="job-page-nav">
            <a href="https://professionmap.ru/vacancies" target="_blank" rel="noopener noreferrer" className="back-link">
              ← Назад к списку вакансий
            </a>
          </div>
        </header>

        {/* Job Details */}
        <div className="job-details">
          <div className="job-header">
            <div className="job-title-section">
              <h1 className="job-title">{vacancyInfo.title}</h1>
              <div className="job-company">
                <span className="company-name">{vacancyInfo.company_name}</span>
              </div>
            </div>
            <div className="job-meta">
              <div className="job-status">
                <span className={`status-badge status-${vacancyInfo.status.toLowerCase()}`}>
                  {vacancyInfo.status === 'ACTIVE' ? 'Активная' : vacancyInfo.status}
                </span>
              </div>
              <div className="job-dates">
                <div className="job-date">
                  <span className="date-label">Опубликована:</span>
                  <span className="date-value">{formatDate(vacancyInfo.created_at)}</span>
                </div>
                {vacancyInfo.expires_at && (
                  <div className="job-date">
                    <span className="date-label">Истекает:</span>
                    <span className="date-value">{formatDate(vacancyInfo.expires_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Job Description */}
          {vacancyInfo.description && (
            <div className="job-section">
              <h2 className="section-title">Описание вакансии</h2>
              <div className="section-content">
                <p className="job-description">{vacancyInfo.description}</p>
              </div>
            </div>
          )}

          {/* Requirements */}
          {vacancyInfo.requirements && (
            <div className="job-section">
              <h2 className="section-title">Требования</h2>
              <div className="section-content">
                <p className="job-requirements">{vacancyInfo.requirements}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="job-actions">
            <button 
              className="apply-button"
              onClick={() => setIsModalOpen(true)}
            >
              Откликнуться
            </button>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Откликнуться на вакансию</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            {isLoadingUser ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Проверка авторизации...</p>
              </div>
            ) : userInfo ? (
              // Authenticated user - simplified form
              <div className="authenticated-form">
                <div className="user-info">
                  <p>Вы авторизованы как: <strong>{userInfo.name}</strong></p>
                  <p>Email: {userInfo.email}</p>
                </div>
                
                <form onSubmit={handleSubmit} className="application-form">
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
            ) : (
              // Unauthenticated user - full form
              <form onSubmit={handleSubmit} className="application-form">
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
            )}
          </div>
        </div>
      )}
    </main>
  );
}
