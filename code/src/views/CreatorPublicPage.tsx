import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProfileAvatar } from "../components/shared/ProfileAvatar";
import { getIdentityNameClass } from "../lib/identity";
import { fetchPublicCreatorProfile } from "../lib/profile";
import type { PublicCreatorProfile } from "../types/auth";
import { VerifiedArtistBadge } from "../components/shared/VerifiedArtistBadge";

const CreatorPublicSkeleton = () => (
  <section className="public-page profile-page-skeleton creator-page-skeleton">
    <div className="public-hero creator-page-skeleton__hero">
      <div className="public-hero__identity">
        <div className="profile-page-skeleton__avatar shimmer" />
        <div className="profile-page-skeleton__content">
          <div className="profile-page-skeleton__line shimmer" style={{ width: "7rem" }} />
          <div className="profile-page-skeleton__line shimmer" style={{ width: "14rem", height: "2rem" }} />
          <div className="profile-page-skeleton__line shimmer" style={{ width: "18rem" }} />
          <div className="profile-page-skeleton__line shimmer" style={{ width: "11rem" }} />
        </div>
      </div>
    </div>

    <div className="public-grid creator-page-skeleton__grid">
      {[1, 2].map((item) => (
        <article className="public-card creator-page-skeleton__card" key={item}>
          <div className="profile-page-skeleton__line shimmer" style={{ width: "7rem" }} />
          <div className="profile-page-skeleton__line shimmer" style={{ width: "13rem", height: "1.8rem" }} />
          <div className="profile-page-skeleton__stack">
            <div className="profile-page-skeleton__line shimmer" style={{ width: "100%" }} />
            <div className="profile-page-skeleton__line shimmer" style={{ width: "88%" }} />
            <div className="profile-page-skeleton__line shimmer" style={{ width: "76%" }} />
          </div>
        </article>
      ))}
    </div>
  </section>
);

export const CreatorPublicPage = () => {
  const { slug } = useParams();
  const [creator, setCreator] = useState<PublicCreatorProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    if (!slug) {
      setStatus("missing");
      return;
    }

    setStatus("loading");
    void fetchPublicCreatorProfile(slug).then((result) => {
      if (result.data) {
        setCreator(result.data);
        setStatus("ready");
        return;
      }

      setCreator(null);
      setStatus("missing");
    });
  }, [slug]);

  if (status === "loading") {
    return <CreatorPublicSkeleton />;
  }

  if (status === "missing" || !creator) {
    return (
      <div className="status-screen">
        <div className="status-screen__card">
          <h1>Creator page unavailable</h1>
          <p>This creator page is missing or not published yet.</p>
          <Link className="solid-button" to="/">
            Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="public-page">
      <div className="public-hero">
        <div className="public-hero__identity">
          <ProfileAvatar
            alt={creator.full_name}
            className="public-avatar"
            name={creator.full_name}
            src={creator.avatar_url}
          />

          <div className="public-hero__copy">
            <span className="section-heading__eyebrow">Creator Profile</span>
            <h1 className="profile-name-row">
              <span className={getIdentityNameClass("creator")}>{creator.full_name}</span>
              {creator.is_verified_artist ? <VerifiedArtistBadge /> : null}
            </h1>
            <p>{creator.headline ?? creator.bio ?? "Independent creator on ArtBlock."}</p>
            <div className="public-meta">
              {creator.username ? <span>@{creator.username}</span> : null}
              {creator.location ? <span>{creator.location}</span> : null}
              {creator.website ? (
                <a href={creator.website} rel="noreferrer" target="_blank">
                  Visit Website
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="public-grid">
        <article className="public-card">
          <span className="section-heading__eyebrow">About</span>
          <h2>What this creator is building</h2>
          <p>{creator.about ?? creator.bio ?? "More work and storytelling details will appear here soon."}</p>
        </article>

        <article className="public-card public-card--accent">
          <span className="section-heading__eyebrow">Featured Quote</span>
          <blockquote>
            {creator.featured_quote ?? "A public creator quote has not been added yet."}
          </blockquote>
        </article>
      </div>
    </section>
  );
};
