import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { getApiUrl } from "../utils/api";
import "./Navbar.css";

interface UserInfo {
  id: number;
  email: string;
  name: string;
  roles: string[];
}

interface NavbarProps {
  currentPath?: string;
}

export function Navbar({ currentPath }: NavbarProps) {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          navigate("/login");
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch(getApiUrl("/api/v1/ats/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      navigate("/login");
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "admin":
        return "Администратор";
      case "hr":
        return "HR";
      case "university":
        return "ВУЗ";
      case "candidate":
        return "Соискатель";
      case "superuser":
        return "Суперпользователь";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "navbar-role-admin";
      case "hr":
        return "navbar-role-hr";
      case "university":
        return "navbar-role-university";
      case "candidate":
        return "navbar-role-candidate";
      case "superuser":
        return "navbar-role-superuser";
      default:
        return "navbar-role-default";
    }
  };

  const isActivePath = (path: string) => {
    return currentPath === path;
  };

  if (isLoading) {
    return (
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h1>ProfessionMap ATS</h1>
          </div>
          <div className="navbar-user">
            <div className="navbar-loading">Загрузка...</div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>ProfessionMap ATS</h1>
        </div>
        
        <div className="navbar-menu">
          <button
            onClick={() => navigate("/cabinet")}
            className={`navbar-link ${isActivePath("/cabinet") ? "active" : ""}`}
          >
            Кабинет
          </button>
          <button
            onClick={() => navigate("/cabinet/my-companies")}
            className={`navbar-link ${isActivePath("/cabinet/my-companies") ? "active" : ""}`}
          >
            Компании
          </button>
          <button
            onClick={() => navigate("/cabinet/my-vacancies")}
            className={`navbar-link ${isActivePath("/cabinet/my-vacancies") ? "active" : ""}`}
          >
            Вакансии
          </button>
          <button
            onClick={() => navigate("/cabinet/funnel")}
            className={`navbar-link ${isActivePath("/cabinet/funnel") ? "active" : ""}`}
          >
            Отклики
          </button>
          {(userInfo?.roles.includes("admin") || userInfo?.roles.includes("superuser")) && (
            <button
              onClick={() => navigate("/admin")}
              className={`navbar-link ${isActivePath("/admin") ? "active" : ""}`}
            >
              Админ
            </button>
          )}
        </div>

        <div className="navbar-user">
          <div className="navbar-user-info">
            <div className="navbar-user-details">
              <span className="navbar-user-name">{userInfo?.name}</span>
              <span className="navbar-user-email">{userInfo?.email}</span>
            </div>
            <div className="navbar-user-roles">
              {userInfo?.roles.map((role, index) => (
                <span
                  key={index}
                  className={`navbar-role ${getRoleColor(role)}`}
                >
                  {getRoleDisplayName(role)}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="navbar-logout"
            title="Выйти"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}
