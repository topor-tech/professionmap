import type { Route } from "./+types/home";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ProfessionMap ATS" },
    { name: "description", content: "Система трекинга вакансий и кандидатов" },
  ];
}

export default function Home() {
  return (
    <main className="flex items-center justify-center pt-16 pb-4" style={{ backgroundColor: '#030e18', color: 'var(--color-text-primary)' }}>
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0 max-w-4xl mx-auto px-4">
        <header className="flex flex-col items-center gap-9">
          <div className="flex items-center gap-8">
            <h1 className="text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Добро пожаловать в ProfessionMap ATS!
            </h1>
          </div>
          <div className="flex gap-4">
            <Link 
              to="/login"
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
              Войти в систему
            </Link>

          </div>
        </header>
      </div>
    </main>
  );
}
