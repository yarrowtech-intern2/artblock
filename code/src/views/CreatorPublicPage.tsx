import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getIdentityNameClass } from "../lib/identity";
import { fetchPublicCreatorProfile } from "../lib/profile";
import type { PublicCreatorProfile } from "../types/auth";
import { VerifiedArtistBadge } from "../components/shared/VerifiedArtistBadge";

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
    return (
      <div className="status-screen">
        <div className="status-screen__card">
          <p>Loading creator page...</p>
        </div>
      </div>
    );
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
          {creator.avatar_url ? (
            <img alt={creator.full_name} className="public-avatar" src={creator.avatar_url} />
          ) : (
            <div className="public-avatar public-avatar--fallback">
              {creator.full_name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}

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
