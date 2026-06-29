import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { manageOwnAccountLifecycle } from "../lib/profile";
import { useAuth } from "../providers/AuthProvider";
import { type Theme, useTheme } from "../providers/ThemeProvider";
import type { InteractionPermission, ProfileVisibility } from "../types/auth";

type ThemeOption = {
  value: Theme;
  label: string;
  description: string;
  bg: string;
  card: string;
  bar: string;
  border: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "White",
    description: "Clean & bright",
    bg: "#f8f8f7",
    card: "#ffffff",
    bar: "#111111",
    border: "rgba(17,17,17,0.1)"
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easy on the eyes",
    bg: "#0a0a0b",
    card: "rgba(255,255,255,0.07)",
    bar: "#f2f2f5",
    border: "rgba(255,255,255,0.08)"
  },
  {
    value: "amoled",
    label: "AMOLED",
    description: "Pure black",
    bg: "#000000",
    card: "rgba(255,255,255,0.04)",
    bar: "#f2f2f5",
    border: "rgba(255,255,255,0.055)"
  }
];

const VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string; description: string }[] = [
  {
    value: "public",
    label: "Public",
    description: "Anyone can open your profile and published posts."
  },
  {
    value: "members",
    label: "Members only",
    description: "Only signed-in members can view your profile."
  },
  {
    value: "private",
    label: "Private",
    description: "Only you can view your profile page."
  }
];

const INTERACTION_OPTIONS: {
  value: InteractionPermission;
  label: string;
  description: string;
}[] = [
  {
    value: "everyone",
    label: "Everyone",
    description: "Anyone who can reach you can interact."
  },
  {
    value: "followers",
    label: "Followers only",
    description: "Only people following you can interact."
  },
  {
    value: "nobody",
    label: "Nobody",
    description: "Disable this interaction across the app."
  }
];

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { profile, settings, signOut, updateSettings, error: authError } = useAuth();
  const { theme, setTheme } = useTheme();
  const [formState, setFormState] = useState({
    keep_me_signed_in: true,
    profile_visibility: "public" as ProfileVisibility,
    message_permissions: "everyone" as InteractionPermission,
    comment_permissions: "everyone" as InteractionPermission,
    notify_new_followers: true,
    notify_new_subscribers: true,
    notify_new_messages: true,
    notify_post_likes: true,
    notify_post_comments: true
  });
  const [isSaving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusyAction, setBusyAction] = useState<"deactivate" | "delete" | null>(null);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setFormState({
      keep_me_signed_in: settings.keep_me_signed_in,
      profile_visibility: settings.profile_visibility,
      message_permissions: settings.message_permissions,
      comment_permissions: settings.comment_permissions,
      notify_new_followers: settings.notify_new_followers,
      notify_new_subscribers: settings.notify_new_subscribers,
      notify_new_messages: settings.notify_new_messages,
      notify_post_likes: settings.notify_post_likes,
      notify_post_comments: settings.notify_post_comments
    });
  }, [settings]);

  if (!profile) {
    return null;
  }

  if (!settings) {
    return (
      <div className="status-screen">
        <div className="status-screen__card">
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const result = await updateSettings(formState);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMessage("Settings saved.");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleDeactivate = async () => {
    const confirmed = window.confirm(
      "Deactivate this account? Your profile becomes unavailable until it is reactivated."
    );

    if (!confirmed) {
      return;
    }

    setBusyAction("deactivate");
    setError(null);
    setMessage(null);
    const result = await manageOwnAccountLifecycle("deactivate");
    setBusyAction(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    await signOut();
    navigate("/login", { replace: true });
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this account permanently? This removes your profile, posts, messages, and settings."
    );

    if (!confirmed) {
      return;
    }

    setBusyAction("delete");
    setError(null);
    setMessage(null);
    const result = await manageOwnAccountLifecycle("delete");
    setBusyAction(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <section className="settings-page">
      <header className="settings-page__header">
        <div>
          <span className="section-heading__eyebrow">System Controls</span>
          <h1>Settings</h1>
          <p>Configure how your account behaves across ArtBlock.</p>
        </div>
        <div className="settings-page__header-actions">
          <Link className="ghost-button" to="/dashboard">
            Dashboard
          </Link>
          <button className="solid-button" disabled={isSaving} onClick={() => void handleSave()} type="button">
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </header>

      {error || authError ? <div className="auth-message auth-message--error">{error ?? authError}</div> : null}
      {message ? <div className="auth-message auth-message--info">{message}</div> : null}

      <div className="settings-grid">
        <article className="dashboard-card settings-card">
          <span className="section-heading__eyebrow">Appearance</span>
          <h2>Theme</h2>
          <p>Choose how the entire app looks on this device.</p>

          <div className="theme-sheet__options settings-theme-grid">
            {THEME_OPTIONS.map((option) => {
              const isActive = theme === option.value;

              return (
                <button
                  aria-pressed={isActive}
                  className={`theme-option${isActive ? " theme-option--active" : ""}`}
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  type="button"
                >
                  <div
                    className="theme-option__preview"
                    style={{ background: option.bg, border: `1.5px solid ${option.border}` }}
                  >
                    <div
                      className="theme-option__card"
                      style={{ background: option.card, border: `1px solid ${option.border}` }}
                    >
                      <div className="theme-option__dot" style={{ background: option.bar, opacity: 0.6 }} />
                      <div className="theme-option__bars">
                        <div className="theme-option__bar" style={{ background: option.bar, opacity: 0.85, width: "70%" }} />
                        <div className="theme-option__bar" style={{ background: option.bar, opacity: 0.4, width: "45%" }} />
                      </div>
                    </div>
                  </div>
                  <span className="theme-option__label">{option.label}</span>
                  <span className="theme-option__desc">{option.description}</span>
                </button>
              );
            })}
          </div>
        </article>

        <article className="dashboard-card settings-card">
          <span className="section-heading__eyebrow">Session</span>
          <h2>Sign-in behavior</h2>
          <p>Control whether your login persists across browser restarts.</p>

          <label className="settings-toggle">
            <div>
              <strong>Keep me signed in</strong>
              <span>Turn this off to end your session when the browser is closed.</span>
            </div>
            <input
              checked={formState.keep_me_signed_in}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  keep_me_signed_in: event.target.checked
                }))
              }
              type="checkbox"
            />
          </label>
        </article>

        <article className="dashboard-card settings-card">
          <span className="section-heading__eyebrow">Privacy</span>
          <h2>Visibility</h2>
          <p>Choose who can discover and open your profile surface.</p>

          <div className="settings-choice-list">
            {VISIBILITY_OPTIONS.map((option) => (
              <label className="settings-choice" key={option.value}>
                <input
                  checked={formState.profile_visibility === option.value}
                  name="profile-visibility"
                  onChange={() =>
                    setFormState((current) => ({
                      ...current,
                      profile_visibility: option.value
                    }))
                  }
                  type="radio"
                />
                <div>
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </div>
              </label>
            ))}
          </div>
        </article>

        <article className="dashboard-card settings-card">
          <span className="section-heading__eyebrow">Permissions</span>
          <h2>Interactions</h2>
          <p>Decide who can contact you and who can comment on your posts.</p>

          <div className="settings-field">
            <label htmlFor="message-permissions">Direct messages</label>
            <select
              id="message-permissions"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  message_permissions: event.target.value as InteractionPermission
                }))
              }
              value={formState.message_permissions}
            >
              {INTERACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p>
              {INTERACTION_OPTIONS.find((option) => option.value === formState.message_permissions)?.description}
            </p>
          </div>

          <div className="settings-field">
            <label htmlFor="comment-permissions">Post comments</label>
            <select
              id="comment-permissions"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  comment_permissions: event.target.value as InteractionPermission
                }))
              }
              value={formState.comment_permissions}
            >
              {INTERACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p>
              {INTERACTION_OPTIONS.find((option) => option.value === formState.comment_permissions)?.description}
            </p>
          </div>
        </article>

        <article className="dashboard-card settings-card">
          <span className="section-heading__eyebrow">Notifications</span>
          <h2>Activity alerts</h2>
          <p>Choose which in-app notifications ArtBlock should create for you.</p>

          <div className="settings-toggle-list">
            <label className="settings-toggle">
              <div>
                <strong>New followers</strong>
                <span>Follower notifications on your profile.</span>
              </div>
              <input
                checked={formState.notify_new_followers}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    notify_new_followers: event.target.checked
                  }))
                }
                type="checkbox"
              />
            </label>

            <label className="settings-toggle">
              <div>
                <strong>New subscribers</strong>
                <span>Creator subscription activity.</span>
              </div>
              <input
                checked={formState.notify_new_subscribers}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    notify_new_subscribers: event.target.checked
                  }))
                }
                type="checkbox"
              />
            </label>

            <label className="settings-toggle">
              <div>
                <strong>New messages</strong>
                <span>Direct message alerts and unread counts.</span>
              </div>
              <input
                checked={formState.notify_new_messages}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    notify_new_messages: event.target.checked
                  }))
                }
                type="checkbox"
              />
            </label>

            <label className="settings-toggle">
              <div>
                <strong>Post likes</strong>
                <span>When someone likes your content.</span>
              </div>
              <input
                checked={formState.notify_post_likes}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    notify_post_likes: event.target.checked
                  }))
                }
                type="checkbox"
              />
            </label>

            <label className="settings-toggle">
              <div>
                <strong>Post comments</strong>
                <span>When someone comments on your posts.</span>
              </div>
              <input
                checked={formState.notify_post_comments}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    notify_post_comments: event.target.checked
                  }))
                }
                type="checkbox"
              />
            </label>
          </div>
        </article>

        <article className="dashboard-card settings-card settings-card--danger">
          <span className="section-heading__eyebrow">Security</span>
          <h2>Account actions</h2>
          <p>Use logout for normal exits. Deactivate or delete only when you want to shut down this account.</p>

          <div className="settings-danger-actions">
            <button className="ghost-button" onClick={() => void handleLogout()} type="button">
              Logout
            </button>
            <button
              className="ghost-button ghost-button--danger"
              disabled={isBusyAction !== null}
              onClick={() => void handleDeactivate()}
              type="button"
            >
              {isBusyAction === "deactivate" ? "Deactivating..." : "Deactivate account"}
            </button>
            <button
              className="solid-button solid-button--danger"
              disabled={isBusyAction !== null}
              onClick={() => void handleDelete()}
              type="button"
            >
              {isBusyAction === "delete" ? "Deleting..." : "Delete account"}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
};
