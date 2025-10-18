import type { Route } from "./+types/home";
import { Link, useNavigate } from "react-router";
import { useState } from "react";
import "./candidate_login.css";
import { getApiUrl } from "../utils/api";
import { useToast } from "../components/ToastProvider";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Вход для кандидатов - ProfessionMap ATS" },
    { name: "description", content: "Войдите в систему как кандидат для просмотра вакансий и подачи откликов" },
  ];
}

export default function CandidateLogin() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(getApiUrl("/api/v1/ats/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // This is required for cookies to be sent and received
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const loginData = await response.json();
        showSuccess("Успешный вход", "Добро пожаловать в систему!");
        // The backend sets the JWT token as an HTTP-only cookie
        // No need to manually store it, it's handled by the browser
        
        // Navigate to apply page for candidates
        setTimeout(() => navigate("/apply"), 1000);
      } else {
        const errorData = await response.json();
        showError("Ошибка входа", errorData.detail || "Неверные учетные данные");
      }
    } catch (err) {
      showError("Ошибка соединения", "Не удалось подключиться к серверу");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen login-container">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 login-title">
            Вход для кандидатов
          </h1>
          <p className="text-lg login-subtitle">
            Войдите в систему для просмотра вакансий и подачи откликов
          </p>
        </div>

        <div className="rounded-3xl p-8 shadow-lg login-form-container">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 login-label">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 login-input disabled:opacity-50"
                placeholder="Введите ваш email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 login-label">
                Пароль
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 login-input disabled:opacity-50"
                placeholder="Введите ваш пароль"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg font-medium transition-colors login-submit-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Вход..." : "Войти как кандидат"}
            </button>
          </form>


          <div className="mt-6 text-center">
            <a 
              href="http://professionmap.ru" 
              className="text-sm hover:underline login-back-link"
            >
              ← Вернуться на главную
            </a>
          </div>

          <div className="mt-4 text-center">
            <Link 
              to="/login" 
              className="text-sm hover:underline login-back-link"
            >
              Вход для HR и администраторов
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
