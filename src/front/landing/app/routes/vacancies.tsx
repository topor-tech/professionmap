import { useState, useEffect } from "react";
import type { Route } from "./+types/vacancies";
import "./vacancies.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Вакансии - ProfessionMap" },
    { name: "description", content: "Актуальные вакансии для молодых специалистов, выпускников и студентов вузов." },
  ];
}

interface Vacancy {
  id: number;
  company_id: number;
  title: string;
  description: string | null;
  requirements: string | null;
  created_at: string;
  company_name: string;
}

export default function Vacancies() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVacancies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determine API base URL based on current hostname
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const apiBaseUrl = isLocalhost 
          ? 'http://localhost:8000' 
          : 'https://ats.professionmap.ru';
        
        const response = await fetch(`${apiBaseUrl}/api/v1/ats/feed/vacancies?limit=50`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setVacancies(data);
      } catch (err) {
        console.error('Error fetching vacancies:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch vacancies');
      } finally {
        setLoading(false);
      }
    };

    fetchVacancies();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <main className="flex items-center justify-center pt-16 pb-4 vacancies-main">
      <div className="flex-1 flex flex-col items-center gap-8 min-h-0 max-w-6xl mx-auto px-4">
        <header className="flex flex-col items-center gap-4 vacancies-header">
          <h1 className="text-4xl font-bold text-center">
            Актуальные вакансии
          </h1>
          <p className="text-lg text-center">
            Найдите подходящую работу для начала карьеры
          </p>
        </header>
        
        <div className="w-full">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="text-lg vacancies-loading">
                Загрузка вакансий...
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl p-6 text-center vacancies-error-container">
              <p className="text-lg vacancies-error-text">
                Ошибка загрузки: {error}
              </p>
            </div>
          )}

          {!loading && !error && vacancies.length === 0 && (
            <div className="rounded-xl p-6 text-center vacancies-empty-container">
              <p className="text-lg vacancies-empty-text">
                Пока нет доступных вакансий
              </p>
            </div>
          )}

          {!loading && !error && vacancies.length > 0 && (
            <div className="space-y-4">
              {vacancies.map((vacancy) => (
                <div
                  key={vacancy.id}
                  className="rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow vacancy-card"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2 vacancy-title">
                        {vacancy.title}
                      </h3>
                      <p className="text-lg font-medium vacancy-company">
                        {vacancy.company_name}
                      </p>
                    </div>
                    <span className="text-sm vacancy-date">
                      {formatDate(vacancy.created_at)}
                    </span>
                  </div>
                  
                  {vacancy.description && (
                    <div className="mb-4">
                      <p className="text-sm leading-relaxed vacancy-description">
                        {vacancy.description}
                      </p>
                    </div>
                  )}
                  
                  {vacancy.requirements && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 vacancy-requirements-title">
                        Требования:
                      </h4>
                      <p className="text-sm leading-relaxed vacancy-requirements-text">
                        {vacancy.requirements}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
