import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../components/auth/AuthCard";
import { LoginForm } from "../components/auth/LoginForm";
import { NewHomePage } from "./NewHomePage";

export const LoginPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="auth-route-modal-page">
      <div aria-hidden="true" className="auth-route-modal-page__background">
        <NewHomePage />
      </div>

      <div
        aria-label="Login"
        aria-modal="true"
        className="auth-route-modal"
        role="dialog"
      >
        <button
          aria-label="Close login"
          className="auth-route-modal__backdrop"
          onClick={() => navigate("/")}
          type="button"
        />

        <div className="auth-route-modal__viewport">
          <section className="auth-route-modal__panel">
            <button
              aria-label="Close login"
              className="auth-route-modal__close"
              onClick={() => navigate("/")}
              type="button"
            >
              ×
            </button>

            <AuthCard
              title="Login to your ArtBlock account"
              subtitle="Use your registered email and password to continue."
            >
              <LoginForm />
            </AuthCard>
          </section>
        </div>
      </div>
    </div>
  );
};
