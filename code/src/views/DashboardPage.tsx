import { useEffect, useRef, useState } from "react";
import { CreatorAccessPanel } from "../components/dashboard/CreatorAccessPanel";
import { Link, Navigate, useLocation } from "react-router-dom";
import { CreatorStudio } from "../components/dashboard/CreatorStudio";
import { PostComposer } from "../components/dashboard/PostComposer";
import { ProfileEditor } from "../components/dashboard/ProfileEditor";
import { getIdentityNameClass } from "../lib/identity";
import { fetchOwnCreatorProfile } from "../lib/profile";
import { useAuth } from "../providers/AuthProvider";
import { VerifiedArtistBadge } from "../components/shared/VerifiedArtistBadge";
import type { CreatorProfile } from "../types/auth";

export const DashboardPage = () => {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const location = useLocation();
  const postingSectionRef = useRef<HTMLDivElement | null>(null);
  const verificationSectionRef = useRef<HTMLDivElement | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [isLoadingCreatorProfile, setLoadingCreatorProfile] = useState(false);

  const loadCreatorProfile = async () => {
    if (!user || profile?.role !== "creator") {
      setCreatorProfile(null);
      return;
    }

    setLoadingCreatorProfile(true);
    const result = await fetchOwnCreatorProfile(user.id);
    setLoadingCreatorProfile(false);

    if (result.data) {
      setCreatorProfile(result.data);
      return;
    }

    setCreatorProfile(null);
  };

  useEffect(() => {
    void loadCreatorProfile();
  }, [user?.id, profile?.role]);

  useEffect(() => {
    if (profile?.role !== "creator") {
      return;
    }

    const targetRef =
      location.hash === "#posting"
        ? postingSectionRef
        : location.hash === "#verification"
          ? verificationSectionRef
          : null;

    if (!targetRef) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, profile?.role]);

  if (!profile || !user) {
    return null;
  }

  if (profile.role === "admin") {
    return <Navigate replace to="/admin" />;
  }

  return (
    <section className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <span className="section-heading__eyebrow">Dashboard</span>
          <h1>{profile.role === "creator" ? "Creator Dashboard" : "Dashboard"}</h1>
          <p>
            Signed in as <span className={getIdentityNameClass(profile.role)}>{profile.full_name}</span>
          </p>
        </div>
        <div className="dashboard-page__actions">
          <Link className="ghost-button" to={`/profiles/${user.id}`}>
            View Profile
          </Link>
          <Link className="ghost-button" to="/settings">
            Settings
          </Link>
          {profile.role === "creator" && creatorProfile?.is_published ? (
            <Link className="ghost-button" to={`/creators/${creatorProfile.slug}`}>
              Public Page
            </Link>
          ) : null}
          <button className="ghost-button" onClick={() => void signOut()} type="button">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-summary">
        <article>
          <span>Role</span>
          <strong className="dashboard-summary__value">
            {profile.role}
            {profile.is_verified_artist ? <VerifiedArtistBadge /> : null}
          </strong>
        </article>
        <article>
          <span>Email</span>
          <strong>{profile.email ?? user.email ?? "Unavailable"}</strong>
        </article>
        <article>
          <span>Username</span>
          <strong>{profile.username ?? "Not set"}</strong>
        </article>
      </div>

      <div className="dashboard-stack">
        <ProfileEditor profile={profile} userId={user.id} onProfileSaved={refreshProfile} />
        <div className="dashboard-anchor-target" id="verification" ref={verificationSectionRef}>
          <CreatorAccessPanel
            creatorProfile={creatorProfile}
            onRefreshCreatorProfile={loadCreatorProfile}
            onRefreshProfile={refreshProfile}
            profile={profile}
          />
        </div>

        {profile.role === "creator" ? (
          <>
            <div className="dashboard-anchor-target" id="posting" ref={postingSectionRef}>
              <PostComposer onPublished={loadCreatorProfile} userId={user.id} />
            </div>
            <CreatorStudio
              creatorProfile={creatorProfile}
              defaultName={profile.full_name}
              onSaved={loadCreatorProfile}
              userId={user.id}
            />
          </>
        ) : (
          <article className="dashboard-card">
            <span className="section-heading__eyebrow">Visitor Mode</span>
            <h2>Your account core is ready</h2>
            <p>
              This visitor account can now branch into creator discovery, follows, saves, and
              personalized feed features.
            </p>
          </article>
        )}

        {profile.role === "creator" && isLoadingCreatorProfile ? (
          <article className="dashboard-card">
            <p>Loading creator page settings...</p>
          </article>
        ) : null}
      </div>
    </section>
  );
};
