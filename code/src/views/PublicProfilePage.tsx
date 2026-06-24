import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FeedCard } from "../components/feed/FeedCard";
import { VerifiedArtistBadge } from "../components/shared/VerifiedArtistBadge";
import {
  fetchProfilePosts,
  fetchProfileRelationshipState,
  fetchPublicProfileById,
  fetchPublicProfileBySlug,
  openDirectThread,
  togglePinnedPost,
  toggleCreatorSubscription,
  toggleFollowProfile
} from "../lib/profile";
import { useAuth } from "../providers/AuthProvider";
import type { FeedPost, ProfileRelationshipState, PublicProfile } from "../types/auth";

const getInitials = (fullName: string) =>
  fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const PublicProfilePage = () => {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [relationship, setRelationship] = useState<ProfileRelationshipState>({
    is_following: false,
    is_subscribed: false
  });
  const [pageStatus, setPageStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [isMutating, setMutating] = useState(false);
  const [isPinningPostId, setPinningPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = Boolean(user?.id && publicProfile?.id === user.id);

  const loadProfile = async () => {
    setPageStatus("loading");
    setError(null);

    const profileResult = id ? await fetchPublicProfileById(id) : slug ? await fetchPublicProfileBySlug(slug) : null;

    if (!profileResult || !profileResult.data) {
      setPublicProfile(null);
      setPosts([]);
      setPageStatus("missing");
      setError(profileResult?.error ?? null);
      return;
    }

    setPublicProfile(profileResult.data);

    if (user?.id) {
      const [postsResult, relationshipResult] = await Promise.all([
        fetchProfilePosts(user.id, profileResult.data.id),
        fetchProfileRelationshipState(user.id, profileResult.data.id)
      ]);

      setPosts(postsResult.data);
      setRelationship(relationshipResult.data);
      setError(postsResult.error ?? relationshipResult.error ?? null);
    } else {
      setPosts([]);
      setRelationship({
        is_following: false,
        is_subscribed: false
      });
    }

    setPageStatus("ready");
  };

  useEffect(() => {
    void loadProfile();
  }, [id, slug, user?.id]);

  const profileMeta = useMemo(() => {
    if (!publicProfile) {
      return [];
    }

    return [
      publicProfile.username ? `@${publicProfile.username}` : null,
      publicProfile.role === "creator" ? "Creator profile" : "Community member",
      publicProfile.location
    ].filter(Boolean) as string[];
  }, [publicProfile]);

  const contentTabs = useMemo(
    () =>
      [
        { key: "all", label: "All" },
        { key: "media", label: "Media" },
        { key: "text", label: "Notes" },
        { key: "poll", label: "Polls" }
      ] as const,
    []
  );
  const [activeTab, setActiveTab] = useState<(typeof contentTabs)[number]["key"]>("all");

  const pinnedPosts = useMemo(
    () => posts.filter((post) => post.is_pinned).slice(0, 3),
    [posts]
  );

  const filteredPosts = useMemo(() => {
    const sourcePosts = posts.filter((post) => !post.is_pinned);

    if (activeTab === "all") {
      return sourcePosts;
    }

    if (activeTab === "media") {
      return sourcePosts.filter((post) => post.post_type === "image" || post.post_type === "video");
    }

    return sourcePosts.filter((post) => post.post_type === activeTab);
  }, [activeTab, posts]);

  useEffect(() => {
    setActiveTab("all");
  }, [publicProfile?.id]);

  const handleFollow = async () => {
    if (!user || !publicProfile) {
      navigate("/login");
      return;
    }

    setMutating(true);
    setError(null);
    const result = await toggleFollowProfile(user.id, publicProfile.id, relationship.is_following);
    setMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setRelationship((current) => ({ ...current, is_following: !current.is_following }));
    setPublicProfile((current) =>
      current
        ? {
            ...current,
            follower_count: current.follower_count + (relationship.is_following ? -1 : 1)
          }
        : current
    );
  };

  const handleSubscribe = async () => {
    if (!user || !publicProfile) {
      navigate("/login");
      return;
    }

    setMutating(true);
    setError(null);
    const result = await toggleCreatorSubscription(
      user.id,
      publicProfile.id,
      relationship.is_subscribed
    );
    setMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setRelationship((current) => ({ ...current, is_subscribed: !current.is_subscribed }));
    setPublicProfile((current) =>
      current
        ? {
            ...current,
            subscriber_count: current.subscriber_count + (relationship.is_subscribed ? -1 : 1)
          }
        : current
    );
  };

  const handleMessage = async () => {
    if (!user || !publicProfile) {
      navigate("/login");
      return;
    }

    setMutating(true);
    setError(null);
    const result = await openDirectThread(publicProfile.id);
    setMutating(false);

    if (result.error || !result.data) {
      setError(result.error ?? "Unable to open direct thread.");
      return;
    }

    navigate(`/messages?thread=${result.data}`);
  };

  const handleTogglePin = async (post: FeedPost) => {
    if (!user) {
      return;
    }

    setPinningPostId(post.id);
    setError(null);
    const result = await togglePinnedPost(post.id, user.id, post.is_pinned);
    setPinningPostId(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    await loadProfile();
  };

  if (pageStatus === "loading") {
    return (
      <div className="status-screen">
        <div className="status-screen__card">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (pageStatus === "missing" || !publicProfile) {
    return (
      <div className="status-screen">
        <div className="status-screen__card">
          <h1>Profile unavailable</h1>
          <p>{error ?? "This profile could not be found."}</p>
          <Link className="solid-button" to="/feed">
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="public-page public-page--full">
      {/* Profile header — Instagram-style on mobile */}
      <div className="public-hero">
        <div className="public-hero__identity">
          {publicProfile.avatar_url ? (
            <img alt={publicProfile.full_name} className="public-avatar" src={publicProfile.avatar_url} />
          ) : (
            <div className="public-avatar public-avatar--fallback">
              {getInitials(publicProfile.full_name)}
            </div>
          )}

          <div className="public-hero__copy">
            <span className="section-heading__eyebrow">
              {publicProfile.role === "creator" ? "Creator" : "Member"}
            </span>
            <h1 className="profile-name-row">
              {publicProfile.full_name}
              {publicProfile.is_verified_artist ? <VerifiedArtistBadge /> : null}
            </h1>
            <p>
              {publicProfile.headline ??
                publicProfile.bio ??
                "No intro added yet."}
            </p>

            <div className="public-meta">
              {profileMeta.map((item) => (
                <span key={item}>{item}</span>
              ))}
              {publicProfile.website ? (
                <a href={publicProfile.website} rel="noreferrer" target="_blank">
                  Website ↗
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="public-profile__actions">
          {isOwnProfile ? (
            <Link className="ghost-button" to="/dashboard">
              Edit profile
            </Link>
          ) : (
            <>
              <button
                className={`ghost-button${relationship.is_following ? " ghost-button--active" : ""}`}
                disabled={isMutating}
                onClick={() => void handleFollow()}
                type="button"
              >
                {relationship.is_following ? "Following" : "Follow"}
              </button>
              {publicProfile.role === "creator" ? (
                <button
                  className={`ghost-button${relationship.is_subscribed ? " ghost-button--active" : ""}`}
                  disabled={isMutating}
                  onClick={() => void handleSubscribe()}
                  type="button"
                >
                  {relationship.is_subscribed ? "Subscribed" : "Subscribe"}
                </button>
              ) : null}
              <button
                className="solid-button"
                disabled={isMutating}
                onClick={() => void handleMessage()}
                type="button"
              >
                Message
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="public-grid public-grid--stats">
        <article className="public-card">
          <span className="section-heading__eyebrow">Followers</span>
          <h2>{publicProfile.follower_count}</h2>
        </article>
        <article className="public-card">
          <span className="section-heading__eyebrow">Following</span>
          <h2>{publicProfile.following_count}</h2>
        </article>
        <article className="public-card">
          <span className="section-heading__eyebrow">Subs</span>
          <h2>{publicProfile.subscriber_count}</h2>
        </article>
        <article className="public-card">
          <span className="section-heading__eyebrow">Posts</span>
          <h2>{publicProfile.post_count}</h2>
        </article>
      </div>

      {error ? <div className="auth-message auth-message--error">{error}</div> : null}

      <div className="public-grid">
        <article className="public-card">
          <span className="section-heading__eyebrow">About</span>
          <h2>Profile story</h2>
          <p>
            {publicProfile.about ??
              publicProfile.bio ??
              "A longer public profile description has not been added yet."}
          </p>
        </article>

        <article className="public-card public-card--accent">
          <span className="section-heading__eyebrow">Featured</span>
          <blockquote>
            {publicProfile.featured_quote ?? "No featured quote has been added yet."}
          </blockquote>
        </article>
      </div>

      {publicProfile.role === "creator" && pinnedPosts.length > 0 ? (
        <div className="public-profile__feed">
          <div className="section-heading">
            <span className="section-heading__eyebrow">Pinned</span>
            <h2>Featured posts from this creator</h2>
          </div>

          <div className="feed-grid">
            {pinnedPosts.map((post) => (
              <FeedCard
                extraActions={
                  isOwnProfile ? (
                    <button
                      className="ghost-button"
                      disabled={isPinningPostId === post.id}
                      onClick={() => void handleTogglePin(post)}
                      type="button"
                    >
                      {isPinningPostId === post.id ? "Updating..." : "Unpin"}
                    </button>
                  ) : undefined
                }
                key={post.id}
                onRefresh={loadProfile}
                post={post}
                viewerId={user?.id ?? ""}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="public-profile__feed">
        <div className="section-heading">
          <span className="section-heading__eyebrow">Posts</span>
          <h2>Recent updates from this profile</h2>
        </div>

        {publicProfile.role === "creator" ? (
          <div className="public-profile__tabs">
            {contentTabs.map((tab) => (
              <button
                className={`feed-chip ${activeTab === tab.key ? "feed-chip--active" : ""}`}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        {status !== "authenticated" ? (
          <div className="empty-feed">
            <h2>Sign in to explore profile activity.</h2>
            <p>Feed interactions, follows, subscriptions, and direct messages require an account session.</p>
            <Link className="solid-button" to="/login">
              Login
            </Link>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="empty-feed">
            <h2>No posts in this section yet.</h2>
            <p>
              {activeTab === "all"
                ? "This profile has not published anything into the feed yet."
                : "This creator has not added content in this profile tab yet."}
            </p>
          </div>
        ) : (
          <div className="feed-grid">
            {filteredPosts.map((post) => (
              <FeedCard
                extraActions={
                  isOwnProfile && publicProfile.role === "creator" ? (
                    <button
                      className="ghost-button"
                      disabled={isPinningPostId === post.id}
                      onClick={() => void handleTogglePin(post)}
                      type="button"
                    >
                      {isPinningPostId === post.id ? "Updating..." : post.is_pinned ? "Unpin" : "Pin"}
                    </button>
                  ) : undefined
                }
                key={post.id}
                onRefresh={loadProfile}
                post={post}
                viewerId={user?.id ?? ""}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
