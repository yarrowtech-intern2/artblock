import { useState, type CSSProperties, type ReactNode } from "react";
import { getIdentityNameClass } from "../../lib/identity";
import { getPostContentText, getRichPostStyleVars } from "../../lib/postRichContent";
import { Link } from "react-router-dom";
import { addComment, renderFormattedText, togglePostLike, togglePostSave, voteOnPoll } from "../../lib/profile";
import type { FeedPost } from "../../types/auth";
import { ProfileAvatar } from "../shared/ProfileAvatar";
import { VerifiedArtistBadge } from "../shared/VerifiedArtistBadge";

type FeedCardProps = {
  post: FeedPost;
  viewerId: string;
  onRefresh: () => Promise<void>;
  extraActions?: ReactNode;
  canDelete?: boolean;
  isDeleting?: boolean;
  onDelete?: (post: FeedPost) => Promise<string | null>;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return mins <= 0 ? "just now" : `${mins}m`;
  }
  if (diffHours < 24) return `${Math.floor(diffHours)}h`;
  if (diffHours < 24 * 7) return `${Math.floor(diffHours / 24)}d`;

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
};

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg aria-hidden="true" fill={filled ? "currentColor" : "none"} height="22" viewBox="0 0 24 24" width="22">
    <path
      d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={filled ? "0" : "1.75"}
    />
  </svg>
);

const BookmarkIcon = ({ filled }: { filled: boolean }) => (
  <svg aria-hidden="true" fill={filled ? "currentColor" : "none"} height="22" viewBox="0 0 24 24" width="22">
    <path
      d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={filled ? "0" : "1.75"}
    />
  </svg>
);

const CommentIcon = () => (
  <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
    <path
      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
    />
  </svg>
);

const SendIcon = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <line stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" x1="22" x2="11" y1="2" y2="13" />
    <polygon fill="currentColor" points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
  </svg>
);

const TrashIcon = () => (
  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
    <path d="M4 7h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    <path d="M10 11v6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    <path d="M14 11v6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    <path
      d="M6 7.5 7 19a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-11.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
    <path d="M9.5 4.5h5l.8 2.5h-6.6l.8-2.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
  </svg>
);

export const FeedCard = ({
  post,
  viewerId,
  onRefresh,
  extraActions,
  canDelete = false,
  isDeleting = false,
  onDelete
}: FeedCardProps) => {
  const [isCommentsOpen, setCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [isMutating, setMutating] = useState(false);
  const [isLiking, setLiking] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optimistic like/save state
  const [localLiked, setLocalLiked] = useState(post.liked_by_viewer);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count);
  const [localSaved, setLocalSaved] = useState(post.saved_by_viewer);

  const totalVotes = post.poll_options.reduce((sum, option) => sum + option.vote_count, 0);
  const canRevealPollResults = Boolean(post.voted_option_id) || totalVotes > 0;
  const postContent = getPostContentText(post.title, post.body);
  const postTextStyle = getRichPostStyleVars(postContent.style, post.post_type === "text") as CSSProperties;
  const commentRestrictionMessage =
    post.comment_permissions === "followers"
      ? "Only followers can comment on this post."
      : "Comments are turned off for this post.";
  const showDeleteAction = canDelete && Boolean(onDelete);

  const handleLike = async () => {
    if (isLiking) return;
    setError(null);
    const prev = { liked: localLiked, count: localLikeCount };
    setLocalLiked(!localLiked);
    setLocalLikeCount((c) => localLiked ? Math.max(0, c - 1) : c + 1);
    setLiking(true);
    const result = await togglePostLike(post.id, viewerId, localLiked);
    setLiking(false);
    if (result.error) {
      setLocalLiked(prev.liked);
      setLocalLikeCount(prev.count);
      setError(result.error);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setError(null);
    const prevSaved = localSaved;
    setLocalSaved(!localSaved);
    setSaving(true);
    const result = await togglePostSave(post.id, viewerId, localSaved);
    setSaving(false);
    if (result.error) {
      setLocalSaved(prevSaved);
      setError(result.error);
    }
  };

  const handleVote = async (optionId: string) => {
    setMutating(true);
    setError(null);
    const result = await voteOnPoll(post.id, optionId, viewerId);
    setMutating(false);
    if (result.error) { setError(result.error); return; }
    await onRefresh();
  };

  const handleCommentSubmit = async (event: { preventDefault(): void }) => {
    event.preventDefault();
    if (!post.viewer_can_comment) {
      setError(commentRestrictionMessage);
      return;
    }
    const trimmed = commentDraft.trim();
    if (!trimmed) return;
    setMutating(true);
    setError(null);
    const result = await addComment(post.id, viewerId, trimmed);
    setMutating(false);
    if (result.error) { setError(result.error); return; }
    setCommentDraft("");
    await onRefresh();
  };

  const handleDelete = async () => {
    if (!onDelete || isDeleting) {
      return;
    }

    setError(null);

    if (!window.confirm("Delete this post? This action cannot be undone.")) {
      return;
    }

    const deleteError = await onDelete(post);

    if (deleteError) {
      setError(deleteError);
    }
  };

  return (
    <article className="feed-card">
      {/* Header: avatar + author info */}
      <header className="feed-card__header">
        <Link className="feed-card__identity feed-card__identity--link" to={`/profiles/${post.author_id}`}>
          <ProfileAvatar
            alt={post.full_name}
            className="feed-card__avatar"
            name={post.full_name}
            src={post.avatar_url}
          />
          <div className="feed-card__identity-text">
            <strong className="feed-card__name">
              <span className={getIdentityNameClass(post.author_role)}>{post.full_name}</span>
              {post.is_verified_artist ? <VerifiedArtistBadge /> : null}
            </strong>
            <p className="feed-card__meta">
              {post.username ? `@${post.username}` : "creator"} · {formatDate(post.created_at)}
            </p>
          </div>
        </Link>

        {post.is_pinned || showDeleteAction ? (
          <div className="feed-card__header-right">
            {post.is_pinned ? <span className="feed-card__pin-badge">Pinned</span> : null}
            {showDeleteAction ? (
              <button
                aria-label="Delete post"
                className="feed-card__delete-button"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
                type="button"
              >
                <TrashIcon />
                <span>{isDeleting ? "Deleting" : "Delete"}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {/* Media / Content */}
      <div className="feed-card__content">
        {post.post_type === "image" && post.media_url ? (
          <img alt={post.body ?? `${post.full_name} post`} className="feed-card__media" src={post.media_url} />
        ) : null}

        {post.post_type === "video" && post.media_url ? (
          <video className="feed-card__media" controls src={post.media_url} />
        ) : null}

        {post.post_type === "text" ? (
          <div
            className={`feed-text-card rich-post-surface${postContent.isRich ? " rich-post-surface--enhanced rich-post-surface--text" : ""}`}
            style={postContent.isRich ? postTextStyle : undefined}
          >
            {postContent.title ? <h3 className={postContent.isRich ? "rich-post-surface__title" : undefined}>{postContent.title}</h3> : null}
            <div
              className={postContent.isRich ? "rich-post-surface__body" : undefined}
              dangerouslySetInnerHTML={{ __html: renderFormattedText(postContent.body ?? "") }}
            />
          </div>
        ) : null}

        {post.post_type === "poll" ? (
          <div
            className={`feed-poll-card rich-post-surface${postContent.isRich ? " rich-post-surface--enhanced" : ""}`}
            style={postContent.isRich ? postTextStyle : undefined}
          >
            <h3 className={postContent.isRich ? "rich-post-surface__title" : undefined}>{postContent.title ?? "Poll"}</h3>
            {postContent.body ? (
              <div
                className={postContent.isRich ? "rich-post-surface__body" : undefined}
                dangerouslySetInnerHTML={{ __html: renderFormattedText(postContent.body) }}
              />
            ) : null}
            <div className="feed-poll-card__options">
              {post.poll_options.map((option) => {
                const voteShare = totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
                const isVoted = post.voted_option_id === option.option_id;
                return (
                  <button
                    className={`poll-option-button${isVoted ? " poll-option-button--active" : ""}`}
                    disabled={isMutating}
                    key={option.option_id}
                    onClick={() => void handleVote(option.option_id)}
                    style={{ "--vote-pct": canRevealPollResults ? `${voteShare}%` : "0%" } as React.CSSProperties}
                    type="button"
                  >
                    <span className="poll-option-button__label">{option.label}</span>
                    {canRevealPollResults ? (
                      <span className="poll-option-button__result">
                        <strong>{voteShare}%</strong>
                      </span>
                    ) : (
                      <span className="poll-option-button__cta">Vote</span>
                    )}
                  </button>
                );
              })}
            </div>
            {totalVotes > 0 ? (
              <p className="feed-poll-card__total">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Caption / body for media posts */}
      {(post.post_type === "image" || post.post_type === "video") && (post.headline ?? postContent.title ?? postContent.body) ? (
        <div className="feed-card__caption">
          {post.headline ? <span className="feed-card__headline">{post.headline}</span> : null}
          <div
            className={`rich-post-surface${postContent.isRich ? " rich-post-surface--enhanced" : ""}`}
            style={postContent.isRich ? postTextStyle : undefined}
          >
            {postContent.title ? <h3 className={postContent.isRich ? "rich-post-surface__title" : "feed-card__caption-title"}>{postContent.title}</h3> : null}
            {postContent.body ? (
              postContent.isRich ? (
                <div
                  className="rich-post-surface__body"
                  dangerouslySetInnerHTML={{ __html: renderFormattedText(postContent.body) }}
                />
              ) : (
                <p>{postContent.body}</p>
              )
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? <div className="auth-message auth-message--error feed-card__error">{error}</div> : null}

      {/* Icon action bar */}
      <div className="feed-card__actions">
        <div className="feed-card__actions-left">
          <button
            aria-label={localLiked ? "Unlike" : "Like"}
            className={`icon-action${localLiked ? " icon-action--liked" : ""}`}
            onClick={() => void handleLike()}
            type="button"
          >
            <HeartIcon filled={localLiked} />
            {localLikeCount > 0 ? <span>{localLikeCount}</span> : null}
          </button>

          <button
            aria-label="Toggle comments"
            className={`icon-action${isCommentsOpen ? " icon-action--active" : ""}`}
            onClick={() => setCommentsOpen((c) => !c)}
            type="button"
          >
            <CommentIcon />
            {post.comment_count > 0 ? <span>{post.comment_count}</span> : null}
          </button>
        </div>

        <div className="feed-card__actions-right">
          {extraActions}
          <button
            aria-label={localSaved ? "Unsave" : "Save"}
            className={`icon-action${localSaved ? " icon-action--saved" : ""}`}
            onClick={() => void handleSave()}
            type="button"
          >
            <BookmarkIcon filled={localSaved} />
          </button>
        </div>
      </div>

      {/* Comments section */}
      {isCommentsOpen ? (
        <div className="feed-comments">
          <form className="feed-comments__composer" onSubmit={handleCommentSubmit}>
            <div className="feed-comments__input-row">
              <input
                autoFocus
                disabled={!post.viewer_can_comment}
                maxLength={500}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder={post.viewer_can_comment ? "Add a comment..." : commentRestrictionMessage}
                type="text"
                value={commentDraft}
              />
              <button
                aria-label="Post comment"
                className="feed-comments__send"
                disabled={isMutating || !commentDraft.trim() || !post.viewer_can_comment}
                type="submit"
              >
                <SendIcon />
              </button>
            </div>
          </form>

          {!post.viewer_can_comment ? (
            <p className="feed-comments__empty">{commentRestrictionMessage}</p>
          ) : null}

          <div className="feed-comments__list">
            {post.comments.length === 0 ? (
              <p className="feed-comments__empty">No comments yet. Be the first.</p>
            ) : null}
            {post.comments.map((comment) => (
              <article className="feed-comment" key={comment.id}>
                <Link className="feed-comment__author" to={`/profiles/${comment.author_id}`}>
                  <span className={getIdentityNameClass(comment.author_role)}>
                    {comment.username ? `@${comment.username}` : comment.full_name}
                  </span>
                  {comment.author_is_verified_artist ? <VerifiedArtistBadge /> : null}
                </Link>
                <span className="feed-comment__body">{comment.body}</span>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
};


