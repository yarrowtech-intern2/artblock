import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../components/auth/AuthCard";
import { SignupForm } from "../components/auth/SignupForm";
import { NewHomePage } from "./NewHomePage";

export const SignupPage = () => {
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
        aria-label="Create account"
        aria-modal="true"
        className="auth-route-modal"
        role="dialog"
      >
        <button
          aria-label="Close signup"
          className="auth-route-modal__backdrop"
          onClick={() => navigate("/")}
          type="button"
        />

        <div className="auth-route-modal__viewport">
          <section className="auth-route-modal__panel auth-route-modal__panel--signup">
            <button
              aria-label="Close signup"
              className="auth-route-modal__close"
              onClick={() => navigate("/")}
              type="button"
            >
              x
            </button>

            <AuthCard
              title="Create your account"
              subtitle="Move through your details one step at a time, then confirm your email to finish."
            >
              <SignupForm />
            </AuthCard>
          </section>
        </div>
      </div>
    </div>
  );
};
