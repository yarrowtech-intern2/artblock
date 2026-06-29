import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { readKeepSignedInPreference } from "../../lib/authSessionPreference";
import { isSupabaseConfigured } from "../../lib/env";
import { useAuth } from "../../providers/AuthProvider";
import { AuthMessage } from "./AuthMessage";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must contain at least 8 characters.")
});

export const LoginForm = () => {
  const navigate = useNavigate();
  const { signIn, error } = useAuth();
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    keepMeSignedIn: readKeepSignedInPreference()
  });
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse(formState);

    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Enter valid credentials.");
      return;
    }

    setFieldError(null);
    setSubmitting(true);
    const result = await signIn({
      ...parsed.data,
      keepMeSignedIn: formState.keepMeSignedIn
    });
    setSubmitting(false);

    if (!result.error) {
      navigate("/feed");
    }
  };

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      {!isSupabaseConfigured ? (
        <AuthMessage
          kind="info"
          message="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env before using authentication."
        />
      ) : null}

      {fieldError ? <AuthMessage kind="error" message={fieldError} /> : null}
      {error ? <AuthMessage kind="error" message={error} /> : null}

      <label>
        Email
        <input
          autoComplete="email"
          name="email"
          onChange={(event) =>
            setFormState((current) => ({ ...current, email: event.target.value }))
          }
          placeholder="creator@artblock.com"
          type="email"
          value={formState.email}
        />
      </label>

      <label>
        Password
        <input
          autoComplete="current-password"
          name="password"
          onChange={(event) =>
            setFormState((current) => ({ ...current, password: event.target.value }))
          }
          placeholder="Enter your password"
          type="password"
          value={formState.password}
        />
      </label>

      <label className="auth-checkbox">
        <input
          checked={formState.keepMeSignedIn}
          name="keep-me-signed-in"
          onChange={(event) =>
            setFormState((current) => ({
              ...current,
              keepMeSignedIn: event.target.checked
            }))
          }
          type="checkbox"
        />
        <span>Keep me signed in</span>
      </label>

      <button className="solid-button solid-button--large" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in..." : "Login"}
      </button>

      {!isSupabaseConfigured ? (
        <p className="auth-form__hint">
          You likely updated <code>.env.example</code>. Create <code>code/.env</code> instead, then
          restart the dev server.
        </p>
      ) : null}

      <p className="auth-form__switch">
        Need an account? <Link to="/signup">Create one</Link>
      </p>
    </form>
  );
};
