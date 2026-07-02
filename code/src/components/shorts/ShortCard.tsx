import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  fetchProfileRelationshipState,
  toggleFollowProfile,
  togglePostLike
} from "../../lib/profile";
import type { ShortPost } from "../../types/auth";
import { ProfileAvatar } from "../shared/ProfileAvatar";
import { VerifiedArtistBadge } from "../shared/VerifiedArtistBadge";

type ShortCardProps = {
  post: ShortPost;
  viewerId: string;
  isActive: boolean;
  onBack: () => void;
  onOpenComments: (post: ShortPost) => void;
  onOpenShare: (post: ShortPost) => void;
  onOpenTip: (post: ShortPost) => void;
};

type Tone = "light" | "dark";
type ToneMap = {
  top: Tone;
  action: Tone;
  bottom: Tone;
};

const DEFAULT_TONES: ToneMap = {
  top: "dark",
  action: "dark",
  bottom: "light"
};

const readTone = (luminance: number): Tone => (luminance > 162 ? "dark" : "light");

const averageLuminance = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  endX: number,
  startY: number,
  endY: number
) => {
  let total = 0;
  let count = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3] / 255;

      if (alpha < 0.25) {
        continue;
      }

      total += data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
      count += 1;
    }
  }

  return count > 0 ? total / count : 128;
};

const measureImageTones = async (assetUrl: string) => {
  const image = new Image();
  image.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to sample reel colors."));
    image.src = assetUrl;
  });

  const canvas = document.createElement("canvas");
  const width = 48;
  const height = 84;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return DEFAULT_TONES;
  }

  context.drawImage(image, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);

  const topTone = readTone(averageLuminance(data, width, height, 0, width, 0, 20));
  const actionTone = readTone(averageLuminance(data, width, height, 28, width, 18, 64));
  const bottomTone = readTone(averageLuminance(data, width, height, 0, width, 58, height));

  return {
    top: topTone,
    action: actionTone,
    bottom: bottomTone
  } satisfies ToneMap;
};

const BackIcon = () => (
  <svg aria-hidden="true" fill="none" height="28" viewBox="0 0 24 24" width="28">
    <path
      d="M19 12H5m0 0 6-6m-6 6 6 6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

const ShortsGlyph = () => (
  <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 20 20" width="22">
    <path
      d="M10 1.75 15.7 10H4.3L10 1.75Zm0 0v16.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg aria-hidden="true" fill={filled ? "currentColor" : "none"} height="30" viewBox="0 0 24 24" width="30">
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
  <svg aria-hidden="true" fill="none" height="30" viewBox="0 0 24 24" width="30">
    <path
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
    />
  </svg>
);

const ShareIcon = () => (
  <svg aria-hidden="true" fill="none" height="30" viewBox="0 0 24 24" width="30">
    <path
      d="M7 17 17 7m0 0H9m8 0v8"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
    />
  </svg>
);

const TipIcon = () => (
  <svg aria-hidden="true" fill="none" height="30" viewBox="0 0 24 24" width="30">
    <path
      d="M12 3v18m4-13.5c0-1.933-1.79-3.5-4-3.5S8 5.567 8 7.5 9.79 11 12 11s4 1.567 4 3.5S14.21 18 12 18s-4-1.567-4-3.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
    />
  </svg>
);

const buildToneStyles = (tones: ToneMap) =>
  ({
    "--short-top-color": tones.top === "dark" ? "#141414" : "#ffffff",
    "--short-top-muted": tones.top === "dark" ? "rgba(20, 20, 20, 0.78)" : "rgba(255, 255, 255, 0.86)",
    "--short-top-chip": tones.top === "dark" ? "rgba(208, 214, 223, 0.52)" : "rgba(28, 28, 32, 0.34)",
    "--short-top-border": tones.top === "dark" ? "rgba(255, 255, 255, 0.36)" : "rgba(255, 255, 255, 0.18)",
    "--short-action-color": tones.action === "dark" ? "#111111" : "#ffffff",
    "--short-action-muted":
      tones.action === "dark" ? "rgba(17, 17, 17, 0.72)" : "rgba(255, 255, 255, 0.82)",
    "--short-action-bg":
      tones.action === "dark" ? "rgba(231, 233, 237, 0.68)" : "rgba(20, 20, 26, 0.3)",
    "--short-action-border":
      tones.action === "dark" ? "rgba(255, 255, 255, 0.38)" : "rgba(255, 255, 255, 0.2)",
    "--short-bottom-color": tones.bottom === "dark" ? "#111111" : "#ffffff",
    "--short-bottom-muted":
      tones.bottom === "dark" ? "rgba(17, 17, 17, 0.72)" : "rgba(255, 255, 255, 0.84)",
    "--short-bottom-shadow":
      tones.bottom === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.26)",
    "--short-bottom-gradient":
      tones.bottom === "dark"
        ? "linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.08) 100%)"
        : "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.42) 100%)"
  } as CSSProperties);

const formatActionCount = (value: number) => {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, "")}K`;
  }

  return String(value);
};

const ActionButton = ({
  label,
  onClick,
  children,
  count,
  disabled = false,
  active = false
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  disabled?: boolean;
  active?: boolean;
}) => (
  <button
    className={`short-card__action${active ? " short-card__action--liked" : ""}`}
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    <span className="short-card__action-icon">{children}</span>
    {typeof count === "number" ? <span className="short-card__action-count">{formatActionCount(count)}</span> : null}
    <span className="short-card__action-label">{label}</span>
  </button>
);

export const ShortCard = ({
  post,
  viewerId,
  isActive,
  onBack,
  onOpenComments,
  onOpenShare,
  onOpenTip
}: ShortCardProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [localLiked, setLocalLiked] = useState(post.liked_by_viewer);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count);
  const [isLiking, setLiking] = useState(false);
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  const [isFollowing, setFollowing] = useState(false);
  const [tones, setTones] = useState<ToneMap>(DEFAULT_TONES);
  const [error, setError] = useState<string | null>(null);

  const description = useMemo(() => {
    if (post.body?.trim()) {
      return post.body.trim();
    }

    if (post.title?.trim()) {
      return post.title.trim();
    }

    return post.headline ?? "Description of the reel...";
  }, [post.body, post.headline, post.title]);

  const toneStyle = useMemo(() => buildToneStyles(tones), [tones]);
  const supportsFollow = Boolean(viewerId) && viewerId !== post.author_id;

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
  }, [post.id, post.liked_by_viewer, post.like_count]);

  useEffect(() => {
    let cancelled = false;
    const assetUrl = post.thumbnail_url ?? post.media_url;

    if (!assetUrl) {
      setTones(DEFAULT_TONES);
      return;
    }

    const loadTones = async () => {
      try {
        const nextTones = await measureImageTones(assetUrl);

        if (!cancelled) {
          setTones(nextTones);
        }
      } catch {
        if (!cancelled) {
          setTones(DEFAULT_TONES);
        }
      }
    };

    void loadTones();

    return () => {
      cancelled = true;
    };
  }, [post.id, post.media_url, post.thumbnail_url]);

  useEffect(() => {
    let cancelled = false;

    if (!supportsFollow) {
      setFollowing(false);
      return;
    }

    const loadRelationship = async () => {
      const result = await fetchProfileRelationshipState(viewerId, post.author_id);

      if (!cancelled && !result.error) {
        setFollowing(result.data.is_following);
      }
    };

    void loadRelationship();

    return () => {
      cancelled = true;
    };
  }, [post.author_id, supportsFollow, viewerId]);

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
    setLocalLikeCount((current) => (localLiked ? Math.max(0, current - 1) : current + 1));
    setLiking(true);
    const result = await togglePostLike(post.id, viewerId, localLiked);
    setLiking(false);

    if (result.error) {
      setLocalLiked(previous.liked);
      setLocalLikeCount(previous.likeCount);
      setError(result.error);
      return;
    }
  };

  const handleFollow = async () => {
    if (!supportsFollow || relationshipLoading) {
      return;
    }

    setRelationshipLoading(true);
    setError(null);
    const result = await toggleFollowProfile(viewerId, post.author_id, isFollowing);
    setRelationshipLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setFollowing((current) => !current);
  };

  return (
    <article className="short-card" data-active={isActive ? "true" : "false"} style={toneStyle}>
      <div className="short-card__media-shell">
        {post.post_type === "video" ? (
          <video
            className="short-card__media short-card__media--video"
            loop
            muted
            playsInline
            poster={post.thumbnail_url ?? undefined}
            preload="metadata"
            ref={videoRef}
            src={post.media_url ?? undefined}
          />
        ) : (
          <img
            alt={description || `${post.full_name} reel`}
            className="short-card__media"
            src={post.media_url ?? undefined}
          />
        )}
        <div className="short-card__gradient" />
      </div>

      <div className="short-card__overlay">
        <div className="short-card__topbar">
          <button
            aria-label="Go back"
            className="short-card__back"
            onClick={onBack}
            type="button"
          >
            <BackIcon />
          </button>

          <div className="short-card__brand">
            <ShortsGlyph />
            <span>Shorts</span>
          </div>

          <div className="short-card__topbar-spacer" aria-hidden="true" />
        </div>

        <div className="short-card__rail">
          <ActionButton
            active={localLiked}
            count={localLikeCount}
            disabled={isLiking}
            label="Like"
            onClick={() => void handleLike()}
          >
            <HeartIcon filled={localLiked} />
          </ActionButton>

          <ActionButton count={post.comment_count} label="Comment" onClick={() => onOpenComments(post)}>
            <CommentIcon />
          </ActionButton>

          <ActionButton count={post.share_count} label="Share" onClick={() => onOpenShare(post)}>
            <ShareIcon />
          </ActionButton>

          {post.tip_enabled ? (
            <ActionButton label="Tip" onClick={() => onOpenTip(post)}>
              <TipIcon />
            </ActionButton>
          ) : null}
        </div>

        <div className="short-card__bottom">
          <div className="short-card__profile">
            <Link className="short-card__profile-link" to={`/profiles/${post.author_id}`}>
              <ProfileAvatar
                alt={post.full_name}
                className="short-card__avatar"
                name={post.full_name}
                src={post.avatar_url}
              />
              <div className="short-card__identity">
                <div className="short-card__identity-row">
                  <strong>{post.full_name}</strong>
                  {post.is_verified_artist ? <VerifiedArtistBadge /> : null}
                </div>
                <span>{post.username ? `@${post.username}` : "@username"}</span>
                <p>{description}</p>
              </div>
            </Link>

            {supportsFollow ? (
              <button
                className={`short-card__follow${isFollowing ? " short-card__follow--active" : ""}`}
                disabled={relationshipLoading}
                onClick={() => void handleFollow()}
                type="button"
              >
                {isFollowing ? "Following" : "Follow"}
                <span aria-hidden="true">+</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <div className="short-card__error auth-message auth-message--error">{error}</div> : null}
      <span className="short-card__metrics" aria-hidden="true">
        {localLikeCount > 0 ? `${localLikeCount} likes` : ""}
        {post.share_count > 0 ? `${localLikeCount > 0 ? " · " : ""}${post.share_count} shares` : ""}
      </span>
    </article>
  );
};
