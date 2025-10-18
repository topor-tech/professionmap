import type { Route } from "./+types/home";
import { useLoaderData, Link } from "react-router";
import { getApiUrl } from "../utils/api";
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

  return (
    <main className="job-page-container">
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
            <button className="apply-button">
              Откликнуться
            </button>
            <button className="share-button">
              Поделиться
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
