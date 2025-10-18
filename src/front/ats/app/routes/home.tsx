import type { Route } from "./+types/home";
import { Link } from "react-router";
import "./home.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ProfessionMap ATS" },
    { name: "description", content: "Система трекинга вакансий и кандидатов" },
  ];
}

export default function Home() {
  return (
    <main className="home-container">
      <div className="home-content">
        <header className="home-header">
          <div className="home-title-container">
            <h1 className="home-title">
              Добро пожаловать в ProfessionMap ATS!
            </h1>
          </div>
          <div className="home-description">
            <p className="description-text">
              Современная система управления талантами и подбора персонала. 
              Найдите идеальную работу или подберите лучших кандидатов для вашей компании.
            </p>
          </div>
          <div className="home-actions">
            <Link 
              to="/jobs"
              className="home-jobs-button"
            >
              Поиск вакансий
            </Link>
            <Link 
              to="/login"
              className="home-login-button"
            >
              Войти как Работодатель в систему
            </Link>
          </div>
        </header>
      </div>
    </main>
  );
}
