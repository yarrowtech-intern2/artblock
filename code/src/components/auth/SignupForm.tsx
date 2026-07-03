import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { COUNTRY_OPTIONS } from "../../lib/countries";
import { isSupabaseConfigured } from "../../lib/env";
import type { ProfileGender } from "../../lib/supabase.types";
import { useAuth } from "../../providers/AuthProvider";
import { AuthMessage } from "./AuthMessage";

type SignupStepKey =
  | "fullName"
  | "email"
  | "phone"
  | "password"
  | "gender"
  | "country"
  | "city"
  | "acceptedTerms";

type SignupFormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  gender: ProfileGender | "";
  country: string;
  city: string;
  acceptedTerms: boolean;
};

const signupSteps: {
  key: SignupStepKey;
  description: string;
  hint?: string;
  title: string;
}[] = [
  {
    key: "fullName",
    title: "What should we call you?",
    description: "Start with the name that should appear on your profile."
  },
  {
    key: "email",
    title: "What's your email?",
    description: "We'll send your confirmation link here."
  },
  {
    key: "phone",
    title: "Add a phone number",
    description: "This is optional for now.",
    hint: "You can skip this step."
  },
  {
    key: "password",
    title: "Create a password",
    description: "Use at least 8 characters."
  },
  {
    key: "gender",
    title: "Select your gender",
    description: "We'll use the existing profile gender options."
  },
  {
    key: "country",
    title: "Choose your country",
    description: "This helps set your basic profile location."
  },
  {
    key: "city",
    title: "Which city are you in?",
    description: "Add the city you want shown on your profile."
  },
  {
    key: "acceptedTerms",
    title: "Confirm the terms",
    description: "Review the final agreement before creating your account."
  }
];

const optionalSteps = new Set<SignupStepKey>(["phone"]);

const phonePattern = /^[0-9+\-()\s]{7,20}$/;

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  email: z.email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || phonePattern.test(value),
      "Enter a valid phone number or skip this step."
    ),
  password: z.string().min(8, "Password must contain at least 8 characters."),
  gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"], {
    message: "Select a gender."
  }),
  country: z.string().trim().min(1, "Select your country."),
  city: z.string().trim().min(1, "City is required."),
  acceptedTerms: z.boolean().refine((value) => value, {
    message: "You must accept the Terms and Conditions."
  })
});

const validateStep = (step: SignupStepKey, state: SignupFormState) => {
  switch (step) {
    case "fullName":
      return signupSchema.shape.fullName.safeParse(state.fullName).success
        ? null
        : "Full name is required.";
    case "email":
      return signupSchema.shape.email.safeParse(state.email).success
        ? null
        : "Enter a valid email address.";
    case "phone":
      return signupSchema.shape.phone.safeParse(state.phone).success
        ? null
        : "Enter a valid phone number or skip this step.";
    case "password":
      return signupSchema.shape.password.safeParse(state.password).success
        ? null
        : "Password must contain at least 8 characters.";
    case "gender":
      return signupSchema.shape.gender.safeParse(state.gender).success
        ? null
        : "Select a gender.";
    case "country":
      return signupSchema.shape.country.safeParse(state.country).success
        ? null
        : "Select your country.";
    case "city":
      return signupSchema.shape.city.safeParse(state.city).success
        ? null
        : "City is required.";
    case "acceptedTerms":
      return signupSchema.shape.acceptedTerms.safeParse(state.acceptedTerms).success
        ? null
        : "You must accept the Terms and Conditions.";
    default:
      return "Enter valid details.";
  }
};

const fieldLabels: Record<SignupStepKey, string> = {
  fullName: "Full name",
  email: "Email",
  phone: "Phone number",
  password: "Password",
  gender: "Gender",
  country: "Country",
  city: "City",
  acceptedTerms: "Terms"
};

export const SignupForm = () => {
  const navigate = useNavigate();
  const { signUp, error } = useAuth();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSuccessOpen, setSuccessOpen] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<SignupFormState>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    gender: "",
    country: "",
    city: "",
    acceptedTerms: false
  });

  const activeStep = signupSteps[activeStepIndex];
  const isLastStep = activeStepIndex === signupSteps.length - 1;
  const progressPercent = ((activeStepIndex + 1) / signupSteps.length) * 100;

  const advanceStep = () => {
    const nextError = validateStep(activeStep.key, formState);

    if (nextError) {
      setFieldError(nextError);
      return;
    }

    setFieldError(null);
    setActiveStepIndex((current) => Math.min(current + 1, signupSteps.length - 1));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isLastStep) {
      advanceStep();
      return;
    }

    const parsed = signupSchema.safeParse(formState);

    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Enter valid details.");
      return;
    }

    setFieldError(null);
    setSuccessOpen(false);
    setSubmitting(true);
    const result = await signUp({
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone.length > 0 ? parsed.data.phone : null,
      password: parsed.data.password,
      gender: parsed.data.gender,
      country: parsed.data.country,
      city: parsed.data.city,
      acceptedTerms: parsed.data.acceptedTerms,
      role: "visitor"
    });
    setSubmitting(false);

    if (result.error) {
      return;
    }

    setSuccessOpen(true);
  };

  const handleBack = () => {
    setFieldError(null);
    setActiveStepIndex((current) => Math.max(current - 1, 0));
  };

  const handleSkip = () => {
    if (!optionalSteps.has(activeStep.key)) {
      return;
    }

    setFieldError(null);
    setFormState((current) => ({ ...current, phone: "" }));
    setActiveStepIndex((current) => Math.min(current + 1, signupSteps.length - 1));
  };

  const renderActiveField = () => {
    switch (activeStep.key) {
      case "fullName":
        return (
          <label className="signup-flow__field">
            <span>{fieldLabels.fullName}</span>
            <input
              autoComplete="name"
              autoFocus
              name="fullName"
              onChange={(event) => {
                setFieldError(null);
                setFormState((current) => ({ ...current, fullName: event.target.value }));
              }}
              placeholder="Aarav Sharma"
              type="text"
              value={formState.fullName}
            />
          </label>
        );
      case "email":
        return (
          <label className="signup-flow__field">
            <span>{fieldLabels.email}</span>
            <input
              autoComplete="email"
              autoFocus
              name="email"
              onChange={(event) => {
                setFieldError(null);
                setFormState((current) => ({ ...current, email: event.target.value }));
              }}
              placeholder="hello@artblock.com"
              type="email"
              value={formState.email}
            />
          </label>
        );
      case "phone":
        return (
          <label className="signup-flow__field">
            <span>{fieldLabels.phone}</span>
            <input
              autoComplete="tel"
              autoFocus
              name="phone"
              onChange={(event) => {
                setFieldError(null);
                setFormState((current) => ({ ...current, phone: event.target.value }));
              }}
              placeholder="+91 98765 43210"
              type="tel"
              value={formState.phone}
            />
          </label>
        );
      case "password":
        return (
          <label className="signup-flow__field">
            <span>{fieldLabels.password}</span>
            <input
              autoComplete="new-password"
              autoFocus
              name="password"
              onChange={(event) => {
                setFieldError(null);
                setFormState((current) => ({ ...current, password: event.target.value }));
              }}
              placeholder="Minimum 8 characters"
              type="password"
              value={formState.password}
            />
          </label>
        );
      case "gender":
        return (
          <label className="signup-flow__field">
            <span>{fieldLabels.gender}</span>
            <select
              autoFocus
              name="gender"
              onChange={(event) => {
                setFieldError(null);
                setFormState((current) => ({
                  ...current,
                  gender: event.target.value as SignupFormState["gender"]
                }));
              }}
              value={formState.gender}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
        );
      case "country":
        return (
          <label className="signup-flow__field">
            <span>{fieldLabels.country}</span>
            <select
              autoFocus
              name="country"
              onChange={(event) => {
                setFieldError(null);
                setFormState((current) => ({ ...current, country: event.target.value }));
              }}
              value={formState.country}
            >
              <option value="">Select country</option>
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
        );
      case "city":
        return (
          <label className="signup-flow__field">
            <span>{fieldLabels.city}</span>
            <input
              autoComplete="address-level2"
              autoFocus
              name="city"
              onChange={(event) => {
                setFieldError(null);
                setFormState((current) => ({ ...current, city: event.target.value }));
              }}
              placeholder="Kolkata"
              type="text"
              value={formState.city}
            />
          </label>
        );
      case "acceptedTerms":
        return (
          <label className="auth-checkbox signup-flow__terms">
            <input
              autoFocus
              checked={formState.acceptedTerms}
              name="acceptedTerms"
              onChange={(event) => {
                setFieldError(null);
                setFormState((current) => ({
                  ...current,
                  acceptedTerms: event.target.checked
                }));
              }}
              type="checkbox"
            />
            <span>
              I agree to the <Link to="/terms">Terms and Conditions</Link>.
            </span>
          </label>
        );
      default:
        return null;
    }
  };

  return (
    <form className="auth-form auth-form--signup-flow" onSubmit={onSubmit}>
      {!isSupabaseConfigured ? (
        <AuthMessage
          kind="info"
          message="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env before using authentication."
        />
      ) : null}

      {fieldError ? <AuthMessage kind="error" message={fieldError} /> : null}
      {error ? <AuthMessage kind="error" message={error} /> : null}

      <div className="signup-flow">
        <div className="signup-flow__progress" aria-label={`Step ${activeStepIndex + 1} of ${signupSteps.length}`}>
          <div className="signup-flow__progress-meta">
            <span>Step {activeStepIndex + 1}</span>
            <span>{signupSteps.length}</span>
          </div>
          <div className="signup-flow__progress-track">
            <span className="signup-flow__progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="signup-flow__step" key={activeStep.key}>
          <div className="signup-flow__copy">
            <span className="signup-flow__eyebrow">Create account</span>
            <h2>{activeStep.title}</h2>
            <p>{activeStep.description}</p>
            {activeStep.hint ? <small>{activeStep.hint}</small> : null}
          </div>

          {renderActiveField()}
        </div>

        <div className="signup-flow__actions">
          {activeStepIndex > 0 ? (
            <button className="signup-flow__secondary" onClick={handleBack} type="button">
              Back
            </button>
          ) : (
            <span />
          )}

          <div className="signup-flow__action-group">
            {optionalSteps.has(activeStep.key) ? (
              <button className="signup-flow__skip" onClick={handleSkip} type="button">
                Skip
              </button>
            ) : null}

            <button className="signup-flow__primary" disabled={isSubmitting} type="submit">
              {isLastStep
                ? isSubmitting
                  ? "Creating account..."
                  : "Create Account"
                : "Next"}
            </button>
          </div>
        </div>
      </div>

      {!isSupabaseConfigured ? (
        <p className="auth-form__hint">
          You likely updated <code>.env.example</code>. Create <code>code/.env</code> instead, then
          restart the dev server.
        </p>
      ) : null}

      <p className="auth-form__switch">
        Already registered? <Link to="/login">Sign in</Link>
      </p>

      {isSuccessOpen ? (
        <div className="signup-success-modal" role="dialog" aria-modal="true" aria-labelledby="signup-success-title">
          <div className="signup-success-modal__backdrop" />
          <div className="signup-success-modal__panel">
            <h2 id="signup-success-title">Account created</h2>
            <p>Please sign in to continue.</p>
            <button
              className="signup-flow__primary signup-success-modal__button"
              onClick={() => navigate("/login")}
              type="button"
            >
              Sign in
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
};
