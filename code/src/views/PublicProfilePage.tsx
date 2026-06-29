import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProfileAvatar } from "../components/shared/ProfileAvatar";
import { VerifiedArtistBadge } from "../components/shared/VerifiedArtistBadge";
import { getIdentityNameClass } from "../lib/identity";
import { getPostContentText } from "../lib/postRichContent";
import {
  deletePost,
  fetchProfilePosts,
  fetchProfileRelationshipState,
  fetchPublicProfileById,
  fetchPublicProfileBySlug,
  openDirectThread,
  toggleCreatorSubscription,
  toggleFollowProfile,
  togglePinnedPost
} from "../lib/profile";
import { useAuth } from "../providers/AuthProvider";
import type { FeedPost, ProfileRelationshipState, PublicProfile } from "../types/auth";
import type { ProfileGender } from "../lib/supabase.types";

const formatCount = (value: number) =>
  new Intl.NumberFormat("en", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(value);

const formatProfileStatCount = (value: number) =>
  value < 100 ? String(value).padStart(2, "0") : formatCount(value);

const getVerifiedArtistTooltip = (gender: ProfileGender | null) => {
  if (gender === "male") {
    return "He is a verified Artist";
  }

  if (gender === "female") {
    return "She is a verified Artist";
  }

  return "They are a verified Artist";
};

type ProfileStatIconKind = "posts" | "followers" | "following" | "subs";

const ProfileStatIcon = ({ kind }: { kind: ProfileStatIconKind }) => {
  if (kind === "posts") {
    return (
      <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
        <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="6" x="4" y="4" />
        <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="6" x="14" y="4" />
        <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="6" x="4" y="14" />
        <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" width="6" x="14" y="14" />
      </svg>
    );
  }

  if (kind === "followers") {
    return (
      <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
        <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 10a2.5 2.5 0 1 0 0-5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="M3.5 19c.7-3.1 2.3-4.7 4.5-4.7s3.8 1.6 4.5 4.7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="M14.5 14.6c1.8.4 3 1.8 3.7 4.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "following") {
    return (
      <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 20c.9-3.7 3.2-5.6 7-5.6s6.1 1.9 7 5.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7L6.8 19l1-5.8-4.2-4.1 5.8-.8L12 3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
};

type ProfilePostTileProps = {
  canDelete: boolean;
  canPin: boolean;
  isDeleting: boolean;
  isPinning: boolean;
  onDelete: (post: FeedPost) => void;
  onTogglePin: (post: FeedPost) => void;
  post: FeedPost;
};

const ProfilePostTile = ({
  canDelete,
  canPin,
  isDeleting,
  isPinning,
  onDelete,
  onTogglePin,
  post
}: ProfilePostTileProps) => {
  const postContent = getPostContentText(post.title, post.body);
  const isMediaPost =
    (post.post_type === "image" || post.post_type === "video") && Boolean(post.media_url);
  const fallbackTitle =
    postContent.title ??
    (post.post_type === "poll" ? "Poll" : post.post_type === "text" ? "Note" : "Post");
  const fallbackBody = postContent.body ?? post.headline ?? "";

  return (
    <article className={`public-post-tile public-post-tile--${post.post_type}`}>
      {post.post_type === "image" && post.media_url ? (
        <img alt={fallbackTitle} className="public-post-tile__media" src={post.media_url} />
      ) : null}

      {post.post_type === "video" && post.media_url ? (
        <video className="public-post-tile__media" muted preload="metadata" src={post.media_url} />
      ) : null}

      {post.post_type === "text" || post.post_type === "poll" || !post.media_url ? (
        <div className="public-post-tile__text">
          <span>{post.post_type === "poll" ? "Poll" : post.post_type === "text" ? "Note" : "Post"}</span>
          <strong>{fallbackTitle}</strong>
          {fallbackBody ? <p>{fallbackBody}</p> : null}
        </div>
      ) : null}

      {post.is_pinned ? <span className="public-post-tile__pin">Pinned</span> : null}

      {!isMediaPost ? (
        <div className="public-post-tile__overlay" aria-hidden="true">
          <span>{formatCount(post.like_count)} likes</span>
          <span>{formatCount(post.comment_count)} comments</span>
        </div>
      ) : null}

      {canDelete || canPin ? (
        <div className="public-post-tile__actions">
          {canPin ? (
            <button
              className="public-post-tile__pin-action"
              disabled={isPinning || isDeleting}
              onClick={() => onTogglePin(post)}
              type="button"
            >
              {isPinning ? "..." : post.is_pinned ? "Unpin" : "Pin"}
            </button>
          ) : null}
          {canDelete ? (
            <button
              className="public-post-tile__delete-action"
              disabled={isDeleting || isPinning}
              onClick={() => onDelete(post)}
              type="button"
            >
              {isDeleting ? "Deleting" : "Delete"}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};

const PublicProfileSkeleton = () => (
  <section className="public-page public-page--instagram profile-page-skeleton">
    <header className="public-profile-showcase profile-page-skeleton__showcase">
      <div className="profile-page-skeleton__cover shimmer" />
      <div className="profile-page-skeleton__body">
        <div className="profile-page-skeleton__avatar shimmer" />
        <div className="profile-page-skeleton__content">
          <div className="profile-page-skeleton__line shimmer" style={{ width: "12rem", height: "1.9rem" }} />
          <div className="profile-page-skeleton__actions">
            <div className="profile-page-skeleton__pill shimmer" />
            <div className="profile-page-skeleton__pill shimmer" />
            <div className="profile-page-skeleton__pill shimmer" />
          </div>
          <div className="profile-page-skeleton__stats">
            {[1, 2, 3].map((item) => (
              <div className="profile-page-skeleton__stat" key={item}>
                <div className="profile-page-skeleton__line shimmer" style={{ width: "3.1rem" }} />
                <div className="profile-page-skeleton__line shimmer" style={{ width: "4.4rem" }} />
              </div>
            ))}
          </div>
          <div className="profile-page-skeleton__stack">
            <div className="profile-page-skeleton__line shimmer" style={{ width: "6rem" }} />
            <div className="profile-page-skeleton__line shimmer" style={{ width: "18rem" }} />
            <div className="profile-page-skeleton__line shimmer" style={{ width: "14rem" }} />
          </div>
        </div>
      </div>
    </header>

    <div className="profile-page-skeleton__tabs">
      {[1, 2, 3, 4].map((item) => (
        <div className="profile-page-skeleton__tab shimmer" key={item} />
      ))}
    </div>

    <div className="profile-page-skeleton__grid">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div className="profile-page-skeleton__tile shimmer" key={item} />
      ))}
    </div>
  </section>
);

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
  const [isDeletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeVerifiedTooltip, setActiveVerifiedTooltip] = useState<"name" | "badge" | null>(null);

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
      publicProfile.role === "creator" ? "Creator profile" : "Community member",
      publicProfile.profile_visibility === "members" ? "Members-only profile" : null,
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

  const visiblePosts = useMemo(() => {
    const sortedPosts = [...posts].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    if (activeTab === "all") {
      return sortedPosts;
    }

    if (activeTab === "media") {
      return sortedPosts.filter((post) => post.post_type === "image" || post.post_type === "video");
    }

    return sortedPosts.filter((post) => post.post_type === activeTab);
  }, [activeTab, posts]);

  useEffect(() => {
    setActiveTab("all");
    setActiveVerifiedTooltip(null);
  }, [publicProfile?.id]);

  const toggleVerifiedTooltip = (target: "name" | "badge") => {
    setActiveVerifiedTooltip((current) => (current === target ? null : target));
  };

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

    if (isOwnProfile) {
      return;
    }

    const canOpenMessage =
      publicProfile.viewer_can_message ||
      publicProfile.message_permissions === "everyone" ||
      (publicProfile.message_permissions === "followers" && relationship.is_following);

    if (!canOpenMessage) {
      setError(
        publicProfile.message_permissions === "followers"
          ? "Only followers can message this profile."
          : "This profile is not accepting direct messages."
      );
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

  const handleDeletePost = async (post: FeedPost) => {
    if (!user) {
      return;
    }

    if (!window.confirm("Delete this post? This action cannot be undone.")) {
      return;
    }

    setDeletingPostId(post.id);
    setError(null);
    const result = await deletePost(post.id, user.id);
    setDeletingPostId(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    setPosts((current) => current.filter((item) => item.id !== post.id));
    setPublicProfile((current) =>
      current
        ? {
            ...current,
            post_count: Math.max(0, current.post_count - 1)
          }
        : current
    );
  };

  if (pageStatus === "loading") {
    return <PublicProfileSkeleton />;
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

  const canMessageProfile =
    !isOwnProfile &&
    (publicProfile.viewer_can_message ||
      publicProfile.message_permissions === "everyone" ||
      (publicProfile.message_permissions === "followers" && relationship.is_following));
  const messageLabel =
    status !== "authenticated" || canMessageProfile
      ? "Message"
      : publicProfile.message_permissions === "followers"
        ? "Followers only"
        : "Messages off";
  const coverImage =
    publicProfile.cover_url ??
    posts.find((post) => post.post_type === "image" && post.media_url)?.media_url ??
    publicProfile.avatar_url;
  const profileStats: { kind: ProfileStatIconKind; label: string; value: number }[] = [
    { kind: "posts", label: "Posts", value: publicProfile.post_count },
    { kind: "followers", label: "Followers", value: publicProfile.follower_count },
    { kind: "subs", label: "Subscriber", value: publicProfile.subscriber_count }
  ];
  const verifiedArtistTooltip = publicProfile.is_verified_artist
    ? getVerifiedArtistTooltip(publicProfile.gender)
    : null;

  return (
    <section className="public-page public-page--instagram public-page--showcase">
      <header className="public-profile-showcase">
        <div className={`public-profile-cover${coverImage ? "" : " public-profile-cover--empty"}`}>
          {coverImage ? <img alt="" aria-hidden="true" src={coverImage} /> : null}
        </div>

        <div className="public-profile-showcase__body">
          <div className="public-profile-avatar-shell">
            <ProfileAvatar
              alt={publicProfile.full_name}
              className="public-profile-avatar"
              name={publicProfile.full_name}
              src={publicProfile.avatar_url}
            />
            {publicProfile.is_verified_artist ? <span className="public-profile-avatar-badge" /> : null}
          </div>

          <div className="public-profile-main">
            <div className="public-profile-heading-row">
              <h1 className="public-profile-username">
                {verifiedArtistTooltip ? (
                  <button
                    aria-label={`${publicProfile.full_name}. ${verifiedArtistTooltip}`}
                    className={`verified-tooltip-trigger public-profile-name-tooltip-trigger${
                      activeVerifiedTooltip === "name" ? " is-active" : ""
                    }`}
                    data-tooltip={verifiedArtistTooltip}
                    onBlur={() => setActiveVerifiedTooltip(null)}
                    onClick={() => toggleVerifiedTooltip("name")}
                    type="button"
                  >
                    <span>{publicProfile.full_name}</span>
                  </button>
                ) : (
                  <span>{publicProfile.full_name}</span>
                )}
                {verifiedArtistTooltip ? (
                  <button
                    aria-label={verifiedArtistTooltip}
                    className={`verified-tooltip-trigger public-profile-badge-tooltip-trigger${
                      activeVerifiedTooltip === "badge" ? " is-active" : ""
                    }`}
                    data-tooltip={verifiedArtistTooltip}
                    onBlur={() => setActiveVerifiedTooltip(null)}
                    onClick={() => toggleVerifiedTooltip("badge")}
                    type="button"
                  >
                    <VerifiedArtistBadge label={verifiedArtistTooltip} />
                  </button>
                ) : null}
              </h1>

              <div className="public-profile-action-slot">
                {isOwnProfile ? (
                  <Link aria-label="Edit profile" className="public-profile-edit-icon" to="/dashboard">
                    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
                      <path
                        d="m5 19 3.8-.8L18.6 8.4a2 2 0 0 0 0-2.8l-.2-.2a2 2 0 0 0-2.8 0L5.8 15.2 5 19Z"
                        fill="currentColor"
                      />
                      <path d="m14.5 6.5 3 3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                    </svg>
                  </Link>
                ) : (
                  <div className="public-profile-actions">
                    <button
                      className={`solid-button${
                        relationship.is_following ? " ghost-button--active public-profile-actions__button--active" : ""
                      }`}
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
                      className="ghost-button"
                      disabled={isMutating || (status === "authenticated" && !canMessageProfile)}
                      onClick={() => void handleMessage()}
                      type="button"
                    >
                      {messageLabel}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <dl className="public-profile-stats">
              {profileStats.map((stat) => (
                <div className={`public-profile-stat public-profile-stat--${stat.kind}`} key={stat.kind}>
                  <span className="public-profile-stat__icon">
                    <ProfileStatIcon kind={stat.kind} />
                  </span>
                  <dt>{stat.label}</dt>
                  <dd>{formatProfileStatCount(stat.value)}</dd>
                </div>
              ))}
            </dl>

            <p className="public-profile-role">
              {publicProfile.role === "creator" ? "Artist" : "Member"}
            </p>
            <div className="public-profile-bio">
              <p>
                {publicProfile.about ??
                  publicProfile.bio ??
                  publicProfile.headline ??
                  "No intro added yet."}
              </p>
              {publicProfile.featured_quote ? <blockquote>{publicProfile.featured_quote}</blockquote> : null}
              <div className="public-meta">
                {profileMeta.map((item) => (
                  <span key={item}>{item}</span>
                ))}
                {publicProfile.website ? (
                  <a href={publicProfile.website} rel="noreferrer" target="_blank">
                    Website
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      {error ? <div className="auth-message auth-message--error">{error}</div> : null}

      <div className="public-profile-tabbar" role="tablist">
        {contentTabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.key}
            className={`public-profile-tab${activeTab === tab.key ? " public-profile-tab--active" : ""}`}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {status !== "authenticated" ? (
        <div className="public-profile-empty">
          <h2>Sign in to explore profile activity.</h2>
          <p>Feed interactions, follows, subscriptions, and direct messages require an account session.</p>
          <Link className="solid-button" to="/login">
            Login
          </Link>
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="public-profile-empty">
          <h2>No posts yet.</h2>
          <p>
            {activeTab === "all"
              ? "This profile has not published anything into the feed yet."
              : "There are no posts in this tab yet."}
          </p>
        </div>
      ) : (
        <div className="public-post-grid">
          {visiblePosts.map((post) => (
            <ProfilePostTile
              canDelete={isOwnProfile}
              canPin={isOwnProfile && publicProfile.role === "creator"}
              isDeleting={isDeletingPostId === post.id}
              isPinning={isPinningPostId === post.id}
              key={post.id}
              onDelete={(targetPost) => void handleDeletePost(targetPost)}
              onTogglePin={(targetPost) => void handleTogglePin(targetPost)}
              post={post}
            />
          ))}
        </div>
      )}
    </section>
  );
};
