import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { getApiUrl } from "../utils/api";
import "./CandidateNavbar.css";

interface UserInfo {
  id: number;
  email: string;
  name: string;
  roles: string[];
}

interface CandidateNavbarProps {
  currentPath?: string;
  allowUnauthenticated?: boolean;
}

export function CandidateNavbar({ currentPath, allowUnauthenticated = false }: CandidateNavbarProps) {
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
          if (allowUnauthenticated) {
            setUserInfo(null);
          } else {
            navigate("/candidate_login");
          }
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        if (allowUnauthenticated) {
          setUserInfo(null);
        } else {
          navigate("/candidate_login");
        }
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
      navigate("/candidate_login");
    }
  };

  const isActivePath = (path: string) => {
    return currentPath === path;
  };

  if (isLoading) {
    return (
      <nav className="candidate-navbar">
        <div className="candidate-navbar-container">
          <div 
            className="candidate-navbar-brand" 
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          >
            <h1>ProfessionMap</h1>
          </div>
          <div className="candidate-navbar-user">
            <div className="candidate-navbar-loading">Загрузка...</div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="candidate-navbar">
      <div className="candidate-navbar-container">
        <div 
          className="candidate-navbar-brand" 
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          <h1>ProfessionMap</h1>
        </div>
        
        {userInfo ? (
          <>
            <div className="candidate-navbar-menu">
              <button
                onClick={() => navigate("/jobs")}
                className={`candidate-navbar-link ${isActivePath("/jobs") ? "active" : ""}`}
              >
                Вакансии
              </button>
              <button
                onClick={() => navigate("/apply")}
                className={`candidate-navbar-link ${isActivePath("/apply") ? "active" : ""}`}
              >
                Мои отклики
              </button>
            </div>

            <div className="candidate-navbar-user">
              <div className="candidate-navbar-user-info">
                <div className="candidate-navbar-user-details">
                  <span className="candidate-navbar-user-name">{userInfo.name}</span>
                  <span className="candidate-navbar-user-email">{userInfo.email}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="candidate-navbar-logout"
                title="Выйти"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="candidate-navbar-user">
            <button
              onClick={() => navigate("/candidate_login")}
              className="candidate-navbar-login"
            >
              Войти
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
