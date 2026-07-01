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
        <div className="dashboard-page__title">
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

      <div className="dashboard-summary dashboard-summary--compact">
        <article className="dashboard-summary__card">
          <span>Role</span>
          <strong className="dashboard-summary__value">
            {profile.role}
            {profile.is_verified_artist ? <VerifiedArtistBadge /> : null}
          </strong>
        </article>
        <article className="dashboard-summary__card">
          <span>Email</span>
          <strong>{profile.email ?? user.email ?? "Unavailable"}</strong>
        </article>
        <article className="dashboard-summary__card">
          <span>Username</span>
          <strong>{profile.username ?? "Not set"}</strong>
        </article>
        <article className="dashboard-summary__card">
          <span>{profile.role === "creator" ? "Creator page" : "Account status"}</span>
          <strong>
            {profile.role === "creator"
              ? creatorProfile?.is_published
                ? "Published"
                : "Draft"
              : "Visitor"}
          </strong>
        </article>
      </div>

      <div className="dashboard-workspace">
        <div className="dashboard-workspace__main">
          <ProfileEditor profile={profile} userId={user.id} onProfileSaved={refreshProfile} />

          {profile.role === "creator" ? (
            <>
              <div className="dashboard-anchor-target dashboard-section" id="posting" ref={postingSectionRef}>
                <div className="dashboard-section__heading">
                  <div>
                    <span className="section-heading__eyebrow">Publishing</span>
                    <h2>Feed posts</h2>
                  </div>
                  <div className="dashboard-section__actions">
                    <Link className="ghost-button" to="/create">
                      Reels & Stories
                    </Link>
                  </div>
                </div>
                <PostComposer onPublished={loadCreatorProfile} showHeader={false} userId={user.id} />
              </div>
              <CreatorStudio
                creatorProfile={creatorProfile}
                defaultName={profile.full_name}
                onSaved={loadCreatorProfile}
                userId={user.id}
              />
            </>
          ) : (
            <article className="dashboard-card dashboard-card--compact">
              <span className="section-heading__eyebrow">Visitor</span>
              <h2>Account ready</h2>
              <p>Use this account for browsing, follows, saves, and upgrades when needed.</p>
            </article>
          )}
        </div>

        <aside className="dashboard-workspace__side">
          <div className="dashboard-anchor-target" id="verification" ref={verificationSectionRef}>
            <CreatorAccessPanel
              creatorProfile={creatorProfile}
              onRefreshCreatorProfile={loadCreatorProfile}
              onRefreshProfile={refreshProfile}
              profile={profile}
            />
          </div>

          {profile.role === "creator" ? (
            <article className="dashboard-card dashboard-card--compact dashboard-utility-card">
              <div className="dashboard-utility-card__header">
                <div>
                  <span className="section-heading__eyebrow">Create</span>
                  <h2>Shortcuts</h2>
                </div>
              </div>
              <div className="dashboard-utility-card__actions">
                <Link className="solid-button" to="/create">
                  Open Create
                </Link>
                {creatorProfile?.is_published && creatorProfile.slug ? (
                  <Link className="ghost-button" to={`/creators/${creatorProfile.slug}`}>
                    Public page
                  </Link>
                ) : null}
              </div>
            </article>
          ) : null}

          {profile.role === "creator" && isLoadingCreatorProfile ? (
            <article className="dashboard-card dashboard-card--compact">
              <p>Loading creator settings...</p>
            </article>
          ) : null}
        </aside>
      </div>
    </section>
  );
};
