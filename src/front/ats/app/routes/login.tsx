import type { Route } from "./+types/login";
import { Link } from "react-router";
import "./login.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Вход в систему - ProfessionMap ATS" },
    { name: "description", content: "Войдите в систему управления вакансиями и кандидатами" },
  ];
}

export default function Login() {
  return (
    <main className="flex items-center justify-center min-h-screen login-container">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 login-title">
            Вход в систему
          </h1>
          <p className="text-lg login-subtitle">
            Добро пожаловать в ProfessionMap ATS
          </p>
        </div>

        <div className="rounded-3xl p-8 shadow-lg login-form-container">
          <form className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 login-label">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 login-input"
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
                required
                className="w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 login-input"
                placeholder="Введите ваш пароль"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 login-checkbox"
                />
                <span className="ml-2 text-sm login-checkbox-label">
                  Запомнить меня
                </span>
              </label>
              <Link 
                to="/forgot-password" 
                className="text-sm hover:underline login-forgot-link"
              >
                Забыли пароль?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg font-medium transition-colors login-submit-button"
            >
              Войти
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm login-register-text">
              Нет аккаунта?{' '}
              <a 
                href="https://t.me/ra_coder" 
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline login-register-link"
              >
                Напиши нам в Telegram @ra_coder
              </a>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link 
              to="/" 
              className="text-sm hover:underline login-back-link"
            >
              ← Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
