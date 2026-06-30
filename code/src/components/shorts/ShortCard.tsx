import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getIdentityNameClass } from "../../lib/identity";
import { recordPostShare, togglePostLike } from "../../lib/profile";
import type { ShortPost } from "../../types/auth";
import { ProfileAvatar } from "../shared/ProfileAvatar";
import { VerifiedArtistBadge } from "../shared/VerifiedArtistBadge";

type ShortCardProps = {
  post: ShortPost;
  viewerId: string;
  isActive: boolean;
  onRefresh: () => Promise<void>;
  onOpenComments: (post: ShortPost) => void;
  onOpenTip: (post: ShortPost) => void;
};

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg aria-hidden="true" fill={filled ? "currentColor" : "none"} height="24" viewBox="0 0 24 24" width="24">
    <path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={filled ? "0" : "1.75"}
    />
  </svg>
);

const CommentIcon = () => (
  <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
    <path
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.75"
    />
  </svg>
);

const ShareIcon = () => (
  <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
    <path
      d="M7 12 17 5m0 0v6m0-6-8 14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
    />
  </svg>
);

const TipIcon = () => (
  <svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24">
    <path
      d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
    />
  </svg>
);

const formatCompactCount = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }

  return String(value);
};

const formatTipAmount = (valuePaise: number) => {
  const rupees = valuePaise / 100;
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(rupees);
};

export const ShortCard = ({
  post,
  viewerId,
  isActive,
  onRefresh,
  onOpenComments,
  onOpenTip
}: ShortCardProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [localLiked, setLocalLiked] = useState(post.liked_by_viewer);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count);
  const [localShareCount, setLocalShareCount] = useState(post.share_count);
  const [isLiking, setLiking] = useState(false);
  const [isSharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (isActive) {
      void video.play().catch(() => undefined);
      return;
    }

    video.pause();
  }, [isActive]);

  useEffect(() => {
    setLocalLiked(post.liked_by_viewer);
    setLocalLikeCount(post.like_count);
    setLocalShareCount(post.share_count);
  }, [post.id, post.liked_by_viewer, post.like_count, post.share_count]);

  const handleLike = async () => {
    if (isLiking) {
      return;
    }

    setError(null);
    const previous = {
      liked: localLiked,
      likeCount: localLikeCount
    };

    setLocalLiked(!localLiked);
    setLocalLikeCount((current) => localLiked ? Math.max(0, current - 1) : current + 1);
    setLiking(true);
    const result = await togglePostLike(post.id, viewerId, localLiked);
    setLiking(false);

    if (result.error) {
      setLocalLiked(previous.liked);
      setLocalLikeCount(previous.likeCount);
      setError(result.error);
    }
  };

  const handleShare = async () => {
    if (isSharing) {
      return;
    }

    setSharing(true);
    setError(null);

    const permalink = `${window.location.origin}/shorts?reel=${post.id}`;
    let platform: "native-share" | "copy-link" = "copy-link";

    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title ?? `${post.full_name} on ArtBlock`,
          text: post.body ?? "Watch this reel on ArtBlock.",
          url: permalink
        });
        platform = "native-share";
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(permalink);
      }

      setLocalShareCount((current) => current + 1);
      await recordPostShare(post.id, viewerId, platform);
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        setSharing(false);
        return;
      }

      setError("Unable to share this reel right now.");
    }

    setSharing(false);
  };

  return (
    <article className="short-card" data-active={isActive ? "true" : "false"}>
      <div className="short-card__media-shell">
        {post.post_type === "video" ? (
          <video
            className="short-card__media"
            loop
            muted
            playsInline
            poster={post.thumbnail_url ?? undefined}
            ref={videoRef}
            src={post.media_url ?? undefined}
          />
        ) : (
          <img
            alt={post.body ?? `${post.full_name} reel`}
            className="short-card__media"
            src={post.media_url ?? undefined}
          />
        )}
        <div className="short-card__gradient" />
      </div>

      <div className="short-card__overlay">
        <div className="short-card__meta">
          <Link className="short-card__author" to={`/profiles/${post.author_id}`}>
            <ProfileAvatar
              alt={post.full_name}
              className="short-card__avatar"
              name={post.full_name}
              src={post.avatar_url}
            />
            <span className="short-card__author-text">
              <strong className={getIdentityNameClass(post.author_role)}>
                {post.full_name}
              </strong>
              {post.is_verified_artist ? <VerifiedArtistBadge /> : null}
            </span>
          </Link>
          {post.title ? <h2>{post.title}</h2> : null}
          {post.body ? <p>{post.body}</p> : null}
          <div className="short-card__support">
            {post.tip_enabled ? <span>Tips on</span> : <span>Tips off</span>}
            <span>Rs {formatTipAmount(post.tip_total_paise)}</span>
          </div>
        </div>

        <div className="short-card__rail">
          <button
            aria-label={localLiked ? "Unlike reel" : "Like reel"}
            className={`short-card__action${localLiked ? " short-card__action--liked" : ""}`}
            onClick={() => void handleLike()}
            type="button"
          >
            <HeartIcon filled={localLiked} />
            <span>{formatCompactCount(localLikeCount)}</span>
          </button>

          <button
            aria-label="Open comments"
            className="short-card__action"
            onClick={() => onOpenComments(post)}
            type="button"
          >
            <CommentIcon />
            <span>{formatCompactCount(post.comment_count)}</span>
          </button>

          <button
            aria-label="Share reel"
            className="short-card__action"
            onClick={() => void handleShare()}
            type="button"
          >
            <ShareIcon />
            <span>{formatCompactCount(localShareCount)}</span>
          </button>

          {post.tip_enabled ? (
            <button
              aria-label="Tip artist"
              className="short-card__action"
              onClick={() => onOpenTip(post)}
              type="button"
            >
              <TipIcon />
              <span>Tip</span>
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="short-card__error">{error}</div> : null}
    </article>
  );
};
