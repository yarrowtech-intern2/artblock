import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { createSlug, upsertCreatorProfile } from "../../lib/profile";
import type { CreatorProfile } from "../../types/auth";

const creatorSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9-]{3,40}$/,
      "Public slug must be 3-40 characters and use lowercase letters, numbers, or hyphens."
    ),
  headline: z.string().max(120, "Headline must stay under 120 characters."),
  about: z.string().max(1200, "About section must stay under 1200 characters."),
  featured_quote: z.string().max(180, "Featured quote must stay under 180 characters.")
});

type CreatorStudioProps = {
  creatorProfile: CreatorProfile | null;
  defaultName: string;
  userId: string;
  onSaved: () => Promise<void>;
};

export const CreatorStudio = ({
  creatorProfile,
  defaultName,
  userId,
  onSaved
}: CreatorStudioProps) => {
  const [formState, setFormState] = useState({
    slug: creatorProfile?.slug ?? createSlug(defaultName),
    headline: creatorProfile?.headline ?? "",
    about: creatorProfile?.about ?? "",
    featured_quote: creatorProfile?.featured_quote ?? "",
    is_published: creatorProfile?.is_published ?? false
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    setFormState({
      slug: creatorProfile?.slug ?? createSlug(defaultName),
      headline: creatorProfile?.headline ?? "",
      about: creatorProfile?.about ?? "",
      featured_quote: creatorProfile?.featured_quote ?? "",
      is_published: creatorProfile?.is_published ?? false
    });
  }, [creatorProfile, defaultName]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const parsed = creatorSchema.safeParse({
      slug: createSlug(formState.slug),
      headline: formState.headline,
      about: formState.about,
      featured_quote: formState.featured_quote
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter valid creator profile details.");
      return;
    }

    setSaving(true);
    const result = await upsertCreatorProfile(userId, {
      slug: parsed.data.slug,
      headline: parsed.data.headline.trim() || null,
      about: parsed.data.about.trim() || null,
      featured_quote: parsed.data.featured_quote.trim() || null,
      is_published: formState.is_published
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await onSaved();
    setMessage(formState.is_published ? "Creator page saved and published." : "Creator draft saved.");
  };

  const publicPath = `/creators/${createSlug(formState.slug)}`;

  return (
    <section className="editor-panel">
      <div className="editor-panel__header">
        <div>
          <span className="section-heading__eyebrow">Creator Presence</span>
          <h2>Creator page</h2>
          <p>Edit the public page slug, intro, and publish state.</p>
        </div>
        {formState.is_published ? (
          <Link className="ghost-button" to={publicPath}>
            View Public Page
          </Link>
        ) : null}
      </div>

      <form className="dashboard-form" onSubmit={handleSubmit}>
        {error ? <div className="auth-message auth-message--error">{error}</div> : null}
        {message ? <div className="auth-message auth-message--info">{message}</div> : null}

        <label>
          Public Slug
          <input
            onChange={(event) =>
              setFormState((current) => ({ ...current, slug: createSlug(event.target.value) }))
            }
            placeholder="artist-name"
            type="text"
            value={formState.slug}
          />
        </label>

        <label>
          Headline
          <input
            onChange={(event) =>
              setFormState((current) => ({ ...current, headline: event.target.value }))
            }
            placeholder="Independent visual storyteller"
            type="text"
            value={formState.headline}
          />
        </label>

        <label className="dashboard-form__full">
          About
          <textarea
            onChange={(event) =>
              setFormState((current) => ({ ...current, about: event.target.value }))
            }
            placeholder="Describe your work, medium, and audience."
            rows={6}
            value={formState.about}
          />
        </label>

        <label className="dashboard-form__full">
          Featured Quote
          <textarea
            onChange={(event) =>
              setFormState((current) => ({ ...current, featured_quote: event.target.value }))
            }
            placeholder="One short line visitors should remember."
            rows={3}
            value={formState.featured_quote}
          />
        </label>

        <label className="toggle-field dashboard-form__full">
          <input
            checked={formState.is_published}
            onChange={(event) =>
              setFormState((current) => ({ ...current, is_published: event.target.checked }))
            }
            type="checkbox"
          />
          <span>Publish this creator page for public visitors</span>
        </label>

        <button className="solid-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save Creator Page"}
        </button>
      </form>
    </section>
  );
};
