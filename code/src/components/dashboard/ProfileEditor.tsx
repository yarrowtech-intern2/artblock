import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { z } from "zod";
import { updateProfile, uploadAvatar, uploadCoverImage } from "../../lib/profile";
import type { ProfileGender } from "../../lib/supabase.types";
import type { Profile } from "../../types/auth";

type GenderFormValue = "" | ProfileGender;

const profileSchema = z.object({
  full_name: z.string().min(2, "Full name must contain at least 2 characters."),
  username: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || /^[a-z0-9-]{3,30}$/.test(value),
      "Username must be 3-30 characters and use lowercase letters, numbers, or hyphens."
    ),
  bio: z.string().max(240, "Bio must stay under 240 characters."),
  gender: z.enum(["", "male", "female", "non_binary", "prefer_not_to_say"]),
  website: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || /^https?:\/\/.+/.test(value),
      "Website must start with http:// or https://."
    ),
  location: z.string().max(80, "Location must stay under 80 characters.")
});

type ProfileEditorProps = {
  profile: Profile;
  userId: string;
  onProfileSaved: () => Promise<void>;
};

const normalizeValue = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const normalizeGender = (value: GenderFormValue): ProfileGender | null =>
  value === "" ? null : value;

export const ProfileEditor = ({
  profile,
  userId,
  onProfileSaved
}: ProfileEditorProps) => {
  const [formState, setFormState] = useState<{
    full_name: string;
    username: string;
    bio: string;
    website: string;
    location: string;
    avatar_url: string;
    cover_url: string;
    gender: GenderFormValue;
  }>({
    full_name: profile.full_name,
    username: profile.username ?? "",
    bio: profile.bio ?? "",
    website: profile.website ?? "",
    location: profile.location ?? "",
    avatar_url: profile.avatar_url ?? "",
    cover_url: profile.cover_url ?? "",
    gender: profile.gender ?? ""
  });
  const [isSaving, setSaving] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [isCoverUploading, setCoverUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormState({
      full_name: profile.full_name,
      username: profile.username ?? "",
      bio: profile.bio ?? "",
      website: profile.website ?? "",
      location: profile.location ?? "",
      avatar_url: profile.avatar_url ?? "",
      cover_url: profile.cover_url ?? "",
      gender: profile.gender ?? ""
    });
  }, [profile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const parsed = profileSchema.safeParse(formState);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter valid profile details.");
      return;
    }

    setSaving(true);
    const result = await updateProfile(userId, {
      full_name: parsed.data.full_name.trim(),
      username: normalizeValue(parsed.data.username.toLowerCase()),
      bio: normalizeValue(parsed.data.bio),
      website: normalizeValue(parsed.data.website),
      location: normalizeValue(parsed.data.location),
      avatar_url: normalizeValue(formState.avatar_url),
      cover_url: normalizeValue(formState.cover_url),
      gender: normalizeGender(parsed.data.gender)
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await onProfileSaved();
    setMessage("Profile details saved.");
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Avatar must be 2 MB or smaller.");
      return;
    }

    setError(null);
    setMessage(null);
    setUploading(true);
    const uploadResult = await uploadAvatar(userId, file);
    setUploading(false);

    if (uploadResult.error || !uploadResult.data) {
      setError(uploadResult.error ?? "Avatar upload failed.");
      return;
    }

    const saveResult = await updateProfile(userId, { avatar_url: uploadResult.data });

    if (saveResult.error) {
      setError(saveResult.error);
      return;
    }

    setFormState((current) => ({ ...current, avatar_url: uploadResult.data! }));
    await onProfileSaved();
    setMessage("Avatar updated.");
    event.target.value = "";
  };

  const handleCoverChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Cover image must be 2 MB or smaller.");
      return;
    }

    setError(null);
    setMessage(null);
    setCoverUploading(true);
    const uploadResult = await uploadCoverImage(userId, file);
    setCoverUploading(false);

    if (uploadResult.error || !uploadResult.data) {
      setError(uploadResult.error ?? "Cover image upload failed.");
      return;
    }

    const saveResult = await updateProfile(userId, { cover_url: uploadResult.data });

    if (saveResult.error) {
      setError(saveResult.error);
      return;
    }

    setFormState((current) => ({ ...current, cover_url: uploadResult.data! }));
    await onProfileSaved();
    setMessage("Cover image updated.");
    event.target.value = "";
  };

  const initials = profile.full_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="editor-panel">
      <div className="editor-panel__header">
        <div>
          <span className="section-heading__eyebrow">Profile</span>
          <h2>Edit profile</h2>
        </div>
      </div>

      <div className="cover-panel">
        <div className={`cover-panel__preview${formState.cover_url ? "" : " cover-panel__preview--empty"}`}>
          {formState.cover_url ? (
            <img alt="" aria-hidden="true" src={formState.cover_url} />
          ) : (
            <span>Cover</span>
          )}
        </div>

        <div className="cover-panel__content">
          <strong>Cover</strong>
          <label className="ghost-button avatar-panel__action">
            {isCoverUploading ? "Uploading..." : "Upload"}
            <input accept="image/png,image/jpeg,image/webp" onChange={handleCoverChange} type="file" />
          </label>
        </div>
      </div>

      <div className="avatar-panel">
        {formState.avatar_url ? (
          <img alt={profile.full_name} className="avatar-panel__image" src={formState.avatar_url} />
        ) : (
          <div className="avatar-panel__fallback">{initials}</div>
        )}

        <div className="avatar-panel__content">
          <strong>Avatar</strong>
          <label className="ghost-button avatar-panel__action">
            {isUploading ? "Uploading..." : "Upload"}
            <input accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} type="file" />
          </label>
        </div>
      </div>

      <form className="dashboard-form" onSubmit={handleSubmit}>
        {error ? <div className="auth-message auth-message--error">{error}</div> : null}
        {message ? <div className="auth-message auth-message--info">{message}</div> : null}

        <label>
          Full Name
          <input
            onChange={(event) =>
              setFormState((current) => ({ ...current, full_name: event.target.value }))
            }
            placeholder="Your display name"
            type="text"
            value={formState.full_name}
          />
        </label>

        <label>
          Username
          <input
            onChange={(event) =>
              setFormState((current) => ({ ...current, username: event.target.value.toLowerCase() }))
            }
            placeholder="creator-name"
            type="text"
            value={formState.username}
          />
        </label>

        <label>
          Gender
          <select
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                gender: event.target.value as GenderFormValue
              }))
            }
            value={formState.gender}
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non_binary">Non-binary</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </label>

        <label className="dashboard-form__full">
          Bio
          <textarea
            onChange={(event) => setFormState((current) => ({ ...current, bio: event.target.value }))}
            placeholder="Write a short introduction."
            rows={4}
            value={formState.bio}
          />
        </label>

        <label>
          Website
          <input
            onChange={(event) =>
              setFormState((current) => ({ ...current, website: event.target.value }))
            }
            placeholder="https://your-site.com"
            type="url"
            value={formState.website}
          />
        </label>

        <label>
          Location
          <input
            onChange={(event) =>
              setFormState((current) => ({ ...current, location: event.target.value }))
            }
            placeholder="City, Country"
            type="text"
            value={formState.location}
          />
        </label>

        <button className="solid-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </section>
  );
};
