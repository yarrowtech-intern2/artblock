import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProfileAvatar } from "../components/shared/ProfileAvatar";
import { VerifiedArtistBadge } from "../components/shared/VerifiedArtistBadge";
import { getIdentityNameClass } from "../lib/identity";
import { getPostContentText } from "../lib/postRichContent";
import {
  fetchCreatorCommunityAccess,
  fetchProfileFollowers,
  fetchProfilePals,
  fetchProfilePosts,
  fetchProfileRelationshipState,
  fetchProfileSubscribers,
  joinArtistCommunity,
  fetchPublicProfileById,
  fetchPublicProfileBySlug,
  openDirectThread,
  toggleCreatorSubscription,
  toggleFollowProfile
} from "../lib/profile";
import { useAuth } from "../providers/AuthProvider";
import type {
  CreatorCommunity,
  FeedPost,
  ProfileConnectionItem,
  ProfileRelationshipState,
  PublicProfile
} from "../types/auth";
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

type ProfileStatIconKind = "posts" | "followers" | "following" | "subs" | "pals";

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

  if (kind === "pals") {
    return (
      <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
        <path d="M8.5 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M15.5 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.8 19.3c.8-2.9 2.5-4.3 4.7-4.3 1.4 0 2.6.6 3.5 1.8.9-1.2 2.1-1.8 3.5-1.8 2.2 0 3.9 1.4 4.7 4.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
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
  onOpen: (post: FeedPost) => void;
  post: FeedPost;
};

type ProfileDirectoryKind = "followers" | "subs" | "pals";

const getProfileTilePreview = (post: FeedPost) => {
  const content = getPostContentText(post.title, post.body);
  const title = (content.title ?? post.headline ?? (post.post_type === "poll" ? "Poll" : "Note")).trim();
  const body = (content.body ?? post.body ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title,
    body: body || "Open post"
  };
};

const ProfilePostTile = ({ onOpen, post }: ProfilePostTileProps) => {
  const thumbnailSrc =
    post.post_type === "video"
      ? post.thumbnail_url ?? post.media_url
      : post.post_type === "image"
        ? post.media_url
        : post.thumbnail_url ?? null;
  const thumbnailLabel =
    post.post_type === "poll" ? "poll post" : post.post_type === "text" ? "note post" : "post";
  const preview = getProfileTilePreview(post);

  return (
    <button
      aria-label={`Open ${thumbnailLabel} from ${post.full_name}`}
      className={`public-post-tile public-post-tile--${post.post_type}`}
      onClick={() => onOpen(post)}
      type="button"
    >
      {thumbnailSrc ? (
        <img alt="" aria-hidden="true" className="public-post-tile__media" src={thumbnailSrc} />
      ) : null}

      {!thumbnailSrc && post.post_type === "video" && post.media_url ? (
        <video aria-hidden="true" className="public-post-tile__media public-post-tile__media--video" muted preload="metadata" src={post.media_url} />
      ) : null}

      {!thumbnailSrc && post.post_type !== "video" ? (
        <div className="public-post-tile__text" aria-hidden="true">
          <span>{post.post_type === "poll" ? "Poll" : "Note"}</span>
          <strong>{preview.title}</strong>
          <p>{preview.body}</p>
        </div>
      ) : null}
    </button>
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
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const postsGridRef = useRef<HTMLDivElement | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [relationship, setRelationship] = useState<ProfileRelationshipState>({
    is_following: false,
    is_subscribed: false
  });
  const [pageStatus, setPageStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [isMutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [activeVerifiedTooltip, setActiveVerifiedTooltip] = useState<"name" | "badge" | null>(null);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [activeDirectory, setActiveDirectory] = useState<ProfileDirectoryKind | null>(null);
  const [directoryItems, setDirectoryItems] = useState<ProfileConnectionItem[]>([]);
  const [isDirectoryLoading, setDirectoryLoading] = useState(false);
  const [palCount, setPalCount] = useState(0);
  const [creatorCommunity, setCreatorCommunity] = useState<CreatorCommunity | null>(null);

  const isOwnProfile = Boolean(user?.id && publicProfile?.id === user.id);

  const loadPalCount = async (targetId: string) => {
    const result = await fetchProfilePals(targetId);

    if (result.error) {
      return { count: 0, error: result.error };
    }

    return { count: result.data.length, error: null };
  };

  const loadProfile = async () => {
    setPageStatus("loading");
    setError(null);

    const profileResult = id ? await fetchPublicProfileById(id) : slug ? await fetchPublicProfileBySlug(slug) : null;

    if (!profileResult || !profileResult.data) {
      setPublicProfile(null);
      setPosts([]);
      setCreatorCommunity(null);
      setPageStatus("missing");
      setError(profileResult?.error ?? null);
      return;
    }

    setPublicProfile(profileResult.data);

    if (user?.id) {
      const [postsResult, relationshipResult, palsResult] = await Promise.all([
        fetchProfilePosts(user.id, profileResult.data.id),
        fetchProfileRelationshipState(user.id, profileResult.data.id),
        loadPalCount(profileResult.data.id)
      ]);

      setPosts(postsResult.data);
      setRelationship(relationshipResult.data);
      setPalCount(palsResult.count);
      setError(postsResult.error ?? relationshipResult.error ?? palsResult.error ?? null);
    } else {
      setPosts([]);
      setRelationship({
        is_following: false,
        is_subscribed: false
      });
      const palsResult = await loadPalCount(profileResult.data.id);
      setPalCount(palsResult.count);
      setError(palsResult.error);
    }

    if (user?.id && profileResult.data.role === "creator") {
      const communityResult = await fetchCreatorCommunityAccess(profileResult.data.id);
      setCreatorCommunity(communityResult.data);

      if (communityResult.error) {
        setError((current) => current ?? communityResult.error);
      }
    } else {
      setCreatorCommunity(null);
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
    setProfileMenuOpen(false);
    setActiveDirectory(null);
    setDirectoryItems([]);
  }, [publicProfile?.id]);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setActiveDirectory(null);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (!activeDirectory) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveDirectory(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDirectory]);

  useEffect(() => {
    if (!infoMessage) {
      return;
    }

    const timer = window.setTimeout(() => setInfoMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [infoMessage]);

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
    void loadPalCount(publicProfile.id).then((result) => {
      if (!result.error) {
        setPalCount(result.count);
      }
    });
    if (publicProfile.role === "creator") {
      void fetchCreatorCommunityAccess(publicProfile.id).then((result) => {
        setCreatorCommunity(result.data);
      });
    }
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
    if (publicProfile.role === "creator") {
      void fetchCreatorCommunityAccess(publicProfile.id).then((result) => {
        setCreatorCommunity(result.data);
      });
    }
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

  const handleCommunityAction = async () => {
    if (!user || !publicProfile || !creatorCommunity) {
      navigate("/login");
      return;
    }

    if (creatorCommunity.viewer_status === "active") {
      navigate(`/messages?community=${creatorCommunity.community_id}`);
      return;
    }

    if (creatorCommunity.viewer_status === "invited") {
      navigate(`/messages?community=${creatorCommunity.community_id}`);
      return;
    }

    setMutating(true);
    setError(null);
    const result = await joinArtistCommunity(creatorCommunity.community_id);
    setMutating(false);

    if (result.error || !result.data) {
      setError(result.error ?? "Unable to join this community.");
      return;
    }

    setInfoMessage("Joined community.");
    const refreshedCommunity = await fetchCreatorCommunityAccess(publicProfile.id);
    setCreatorCommunity(refreshedCommunity.data);
    navigate(`/messages?community=${result.data}`);
  };

  const handleOpenPost = (post: FeedPost) => {
    if (!publicProfile) {
      return;
    }

    const target = publicProfile.creator_slug
      ? `/creators/${publicProfile.creator_slug}/posts/${post.id}`
      : `/profiles/${publicProfile.id}/posts/${post.id}`;
    navigate(target);
  };

  const handleMenuNavigate = (target: string) => {
    setProfileMenuOpen(false);
    navigate(target);
  };

  const handleShareProfile = async () => {
    if (typeof window === "undefined" || !publicProfile) {
      return;
    }

    const permalink = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: publicProfile.full_name,
          text: `Check out ${publicProfile.full_name} on Artblock.`,
          url: permalink
        });
        setInfoMessage("Profile shared.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(permalink);
        setInfoMessage("Profile link copied.");
      } else {
        throw new Error("Sharing is not supported on this device.");
      }

      setError(null);
    } catch (shareError) {
      const message =
        shareError instanceof Error && shareError.message
          ? shareError.message
          : "Unable to share this profile right now.";
      setError(message);
    } finally {
      setProfileMenuOpen(false);
    }
  };

  const handleOpenDirectory = async (kind: ProfileDirectoryKind) => {
    if (!publicProfile) {
      return;
    }

    setProfileMenuOpen(false);
    setActiveDirectory(kind);
    setDirectoryItems([]);
    setDirectoryLoading(true);

    const result =
      kind === "followers"
        ? await fetchProfileFollowers(publicProfile.id)
        : kind === "subs"
          ? await fetchProfileSubscribers(publicProfile.id)
          : await fetchProfilePals(publicProfile.id);

    setDirectoryLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDirectoryItems(result.data);
  };

  const handleStatAction = (kind: ProfileStatIconKind) => {
    if (kind === "posts") {
      setActiveTab("all");
      postsGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (kind === "followers" || kind === "subs" || kind === "pals") {
      void handleOpenDirectory(kind);
    }
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
  const canShowCommunityButton =
    Boolean(
      !isOwnProfile &&
        user?.id &&
        publicProfile.role === "creator" &&
        creatorCommunity &&
        (creatorCommunity.viewer_status === "active" ||
          creatorCommunity.viewer_status === "invited" ||
          relationship.is_following ||
          relationship.is_subscribed)
    );
  const communityLabel =
    creatorCommunity?.viewer_status === "active"
      ? "Open community"
      : creatorCommunity?.viewer_status === "invited"
        ? "View invite"
        : "Join community";
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
    { kind: "pals", label: "Pals", value: palCount },
    { kind: "subs", label: "Subscriber", value: publicProfile.subscriber_count }
  ];
  const verifiedArtistTooltip = publicProfile.is_verified_artist
    ? getVerifiedArtistTooltip(publicProfile.gender)
    : null;
  const dashboardTarget = publicProfile.role === "creator" ? "/dashboard#posting" : "/dashboard";
  const directoryTitle =
    activeDirectory === "subs" ? "Subscribers" : activeDirectory === "pals" ? "Pals" : "Followers";
  const directoryCount =
    activeDirectory === "subs"
      ? publicProfile.subscriber_count
      : activeDirectory === "pals"
        ? palCount
        : publicProfile.follower_count;

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
            <div className={`public-profile-heading-row${isOwnProfile ? " public-profile-heading-row--owner" : ""}`}>
              <div className="public-profile-title-line">
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
                <span className="public-profile-role">
                  {publicProfile.role === "creator" ? "Artist" : "Member"}
                </span>
              </div>

              <div className="public-profile-action-slot" ref={profileMenuRef}>
                {isOwnProfile ? (
                  <div className="public-profile-menu-shell">
                    <button
                      aria-expanded={isProfileMenuOpen}
                      aria-haspopup="menu"
                      aria-label="Open profile actions"
                      className={`public-profile-kebab${isProfileMenuOpen ? " is-active" : ""}`}
                      onClick={() => setProfileMenuOpen((current) => !current)}
                      type="button"
                    >
                      <span />
                      <span />
                      <span />
                    </button>
                    <div className={`public-profile-menu${isProfileMenuOpen ? " public-profile-menu--open" : ""}`} role="menu">
                      <button className="public-profile-menu__item" onClick={() => handleMenuNavigate("/dashboard")} role="menuitem" type="button">
                        <span>Edit profile</span>
                        <small>Open the full profile editor</small>
                      </button>
                      {publicProfile.role === "creator" ? (
                        <button className="public-profile-menu__item" onClick={() => handleMenuNavigate(dashboardTarget)} role="menuitem" type="button">
                          <span>Dashboard</span>
                          <small>Jump to your publishing workspace</small>
                        </button>
                      ) : null}
                      {publicProfile.role === "creator" ? (
                        <button
                          className="public-profile-menu__item"
                          onClick={() => handleMenuNavigate("/dashboard#community")}
                          role="menuitem"
                          type="button"
                        >
                          <span>{creatorCommunity ? "Open community" : "Create community"}</span>
                          <small>
                            {creatorCommunity
                              ? "Manage your artist community and invites"
                              : "Set up your artist community"}
                          </small>
                        </button>
                      ) : null}
                      <button className="public-profile-menu__item" onClick={() => handleMenuNavigate("/settings")} role="menuitem" type="button">
                        <span>Settings</span>
                        <small>Privacy, notifications, and account</small>
                      </button>
                      <button
                        className="public-profile-menu__item"
                        onClick={() => handleMenuNavigate("/messages?view=communities")}
                        role="menuitem"
                        type="button"
                      >
                        <span>Joined groups</span>
                        <small>Open the communities you joined</small>
                      </button>
                      <button className="public-profile-menu__item" onClick={() => void handleShareProfile()} role="menuitem" type="button">
                        <span>Share profile</span>
                        <small>Send or copy your public profile link</small>
                      </button>
                    </div>
                  </div>
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
                    {canShowCommunityButton ? (
                      <button
                        className="ghost-button"
                        disabled={isMutating}
                        onClick={() => void handleCommunityAction()}
                        type="button"
                      >
                        {communityLabel}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="public-profile-stats">
              {profileStats.map((stat) => (
                <button
                  className={`public-profile-stat public-profile-stat--${stat.kind}`}
                  key={stat.kind}
                  onClick={() => handleStatAction(stat.kind)}
                  type="button"
                >
                  <span className="public-profile-stat__icon">
                    <ProfileStatIcon kind={stat.kind} />
                  </span>
                  <strong>{formatProfileStatCount(stat.value)}</strong>
                  <span>{stat.label}</span>
                </button>
              ))}
            </div>
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
      {infoMessage ? <div className="auth-message auth-message--info">{infoMessage}</div> : null}

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
        <div className="public-post-grid" ref={postsGridRef}>
          {visiblePosts.map((post) => (
            <ProfilePostTile
              key={post.id}
              onOpen={handleOpenPost}
              post={post}
            />
          ))}
        </div>
      )}

      {activeDirectory ? (
        <div className="public-profile-sheet" role="dialog" aria-modal="true" aria-labelledby="public-profile-sheet-title">
          <div className="public-profile-sheet__backdrop" onClick={() => setActiveDirectory(null)} />
          <section className="public-profile-sheet__panel">
            <div className="public-profile-sheet__header">
              <div>
                <h2 id="public-profile-sheet-title">{directoryTitle}</h2>
                <p>{formatCount(directoryCount)}</p>
              </div>
              <button className="ghost-button" onClick={() => setActiveDirectory(null)} type="button">
                Close
              </button>
            </div>

            {isDirectoryLoading ? (
              <p className="public-profile-sheet__empty">Loading {directoryTitle.toLowerCase()}...</p>
            ) : directoryItems.length === 0 ? (
              <p className="public-profile-sheet__empty">No {directoryTitle.toLowerCase()} yet.</p>
            ) : (
              <div className="public-profile-sheet__list">
                {directoryItems.map((item) => (
                  <button
                    className="public-profile-sheet__item"
                    key={item.id}
                    onClick={() => {
                      setActiveDirectory(null);
                      navigate(item.creator_slug ? `/creators/${item.creator_slug}` : `/profiles/${item.id}`);
                    }}
                    type="button"
                  >
                    <ProfileAvatar
                      alt={item.full_name}
                      className="public-profile-sheet__avatar"
                      name={item.full_name}
                      src={item.avatar_url}
                    />
                    <div className="public-profile-sheet__copy">
                      <strong className="profile-name-row">
                        <span className={getIdentityNameClass(item.role)}>
                          {item.username ? `@${item.username}` : item.full_name}
                        </span>
                        {item.is_verified_artist ? <VerifiedArtistBadge /> : null}
                      </strong>
                      <span>{item.headline ?? item.full_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
};
