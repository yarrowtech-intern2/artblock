import { useEffect, useMemo, useState } from "react";
import { ProfileAvatar } from "../shared/ProfileAvatar";
import { VerifiedArtistBadge } from "../shared/VerifiedArtistBadge";
import { getIdentityNameClass } from "../../lib/identity";
import { fetchStoryViewReceipts } from "../../lib/profile";
import type { StoryGroup, StoryItem, StoryViewReceipt } from "../../types/auth";

type StoryViewerProps = {
  groups: StoryGroup[];
  startingAuthorId: string | null;
  onClose: () => void;
  onViewed: (storyId: string) => void;
  viewerId: string | null;
};

const IMAGE_STORY_DURATION_MS = 5000;

const getStoryDurationMs = (story: StoryItem) =>
  story.media_kind === "video"
    ? Math.min(Math.max((story.media_duration_seconds ?? 7) * 1000, 5000), 20000)
    : IMAGE_STORY_DURATION_MS;

const formatStoryTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));

export const StoryViewer = ({
  groups,
  startingAuthorId,
  onClose,
  onViewed,
  viewerId
}: StoryViewerProps) => {
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [progressMs, setProgressMs] = useState(0);
  const [viewReceipts, setViewReceipts] = useState<StoryViewReceipt[]>([]);
  const [isLoadingViewReceipts, setLoadingViewReceipts] = useState(false);
  const [viewReceiptsError, setViewReceiptsError] = useState<string | null>(null);

  useEffect(() => {
    if (!startingAuthorId) {
      return;
    }

    const nextGroupIndex = Math.max(
      0,
      groups.findIndex((group) => group.author_id === startingAuthorId)
    );
    const nextStoryIndex = Math.max(
      0,
      groups[nextGroupIndex]?.items.findIndex((item) => !item.viewed_by_viewer) ?? 0
    );

    setActiveGroupIndex(nextGroupIndex);
    setActiveStoryIndex(nextStoryIndex > -1 ? nextStoryIndex : 0);
    setProgressMs(0);
  }, [groups, startingAuthorId]);

  const activeGroup = groups[activeGroupIndex] ?? null;
  const activeStory = activeGroup?.items[activeStoryIndex] ?? null;
  const durationMs = activeStory ? getStoryDurationMs(activeStory) : IMAGE_STORY_DURATION_MS;
  const isOwnActiveStory = Boolean(activeStory && viewerId && activeStory.author_id === viewerId);

  const progressEntries = useMemo(
    () =>
      activeGroup?.items.map((item, index) => {
        if (index < activeStoryIndex) {
          return 1;
        }

        if (index > activeStoryIndex || !activeStory) {
          return 0;
        }

        return Math.min(progressMs / durationMs, 1);
      }) ?? [],
    [activeGroup?.items, activeStory, activeStoryIndex, durationMs, progressMs]
  );

  useEffect(() => {
    if (!activeStory) {
      return;
    }

    onViewed(activeStory.id);
  }, [activeStory?.id, onViewed]);

  useEffect(() => {
    if (!activeStory || !isOwnActiveStory) {
      setViewReceipts([]);
      setLoadingViewReceipts(false);
      setViewReceiptsError(null);
      return;
    }

    let cancelled = false;

    const loadViewReceipts = async () => {
      setLoadingViewReceipts(true);
      setViewReceiptsError(null);

      const result = await fetchStoryViewReceipts(activeStory.id, activeStory.author_id);

      if (cancelled) {
        return;
      }

      setLoadingViewReceipts(false);

      if (result.error) {
        setViewReceipts([]);
        setViewReceiptsError(result.error);
        return;
      }

      setViewReceipts(result.data);
    };

    void loadViewReceipts();

    return () => {
      cancelled = true;
    };
  }, [activeStory?.author_id, activeStory?.id, isOwnActiveStory]);

  useEffect(() => {
    if (!activeStory) {
      return;
    }

    setProgressMs(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgressMs(elapsed);

      if (elapsed >= durationMs) {
        window.clearInterval(timer);
        setProgressMs(durationMs);
        if (activeStoryIndex < (activeGroup?.items.length ?? 0) - 1) {
          setActiveStoryIndex((current) => current + 1);
          return;
        }

        if (activeGroupIndex < groups.length - 1) {
          setActiveGroupIndex((current) => current + 1);
          setActiveStoryIndex(0);
          return;
        }

        onClose();
      }
    }, 120);

    return () => window.clearInterval(timer);
  }, [activeGroup?.items.length, activeGroupIndex, activeStory?.id, activeStoryIndex, durationMs, groups.length, onClose]);

  if (!startingAuthorId || !activeGroup || !activeStory) {
    return null;
  }

  const goPrev = () => {
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((current) => current - 1);
      return;
    }

    if (activeGroupIndex > 0) {
      const previousGroup = groups[activeGroupIndex - 1];
      setActiveGroupIndex((current) => current - 1);
      setActiveStoryIndex(Math.max(0, previousGroup.items.length - 1));
      return;
    }

    onClose();
  };

  const goNext = () => {
    if (activeStoryIndex < activeGroup.items.length - 1) {
      setActiveStoryIndex((current) => current + 1);
      return;
    }

    if (activeGroupIndex < groups.length - 1) {
      setActiveGroupIndex((current) => current + 1);
      setActiveStoryIndex(0);
      return;
    }

    onClose();
  };

  return (
    <div className="story-viewer" role="dialog" aria-modal="true" aria-label="Story viewer">
      <div className="story-viewer__backdrop" onClick={onClose} />
      <section className="story-viewer__panel">
        <div className="story-viewer__progress" aria-hidden="true">
          {progressEntries.map((entry, index) => (
            <span className="story-viewer__progress-track" key={`${activeGroup.author_id}-${index}`}>
              <span className="story-viewer__progress-fill" style={{ transform: `scaleX(${entry})` }} />
            </span>
          ))}
        </div>

        <header className="story-viewer__header">
          <div className="story-viewer__identity">
            <ProfileAvatar
              alt={activeGroup.full_name}
              className="story-viewer__avatar"
              name={activeGroup.full_name}
              src={activeGroup.avatar_url}
            />
            <div>
              <strong className="story-viewer__name">
                <span className={getIdentityNameClass(activeGroup.author_role)}>{activeGroup.full_name}</span>
                {activeGroup.is_verified_artist ? <VerifiedArtistBadge /> : null}
              </strong>
              <p>{formatStoryTime(activeStory.created_at)}</p>
            </div>
          </div>

          <button className="story-viewer__close" onClick={onClose} type="button">
            Close
          </button>
        </header>

        <div className="story-viewer__surface">
          <button aria-label="Previous story" className="story-viewer__nav story-viewer__nav--left" onClick={goPrev} type="button" />
          <article className="story-viewer__card">
            {activeStory.media_kind === "video" ? (
              <video
                autoPlay
                className="story-viewer__media"
                muted
                playsInline
                src={activeStory.media_url}
              />
            ) : (
              <img alt={activeStory.body ?? `${activeGroup.full_name} story`} className="story-viewer__media" src={activeStory.media_url} />
            )}
            {activeStory.body ? <div className="story-viewer__caption">{activeStory.body}</div> : null}
          </article>
          <button aria-label="Next story" className="story-viewer__nav story-viewer__nav--right" onClick={goNext} type="button" />
        </div>

        {isOwnActiveStory ? (
          <section className="story-viewer__viewers" aria-live="polite">
            <div className="story-viewer__viewers-header">
              <strong>Seen by {viewReceipts.length}</strong>
              {isLoadingViewReceipts ? <span>Updating…</span> : null}
            </div>

            {viewReceiptsError ? (
              <p className="story-viewer__viewers-empty">{viewReceiptsError}</p>
            ) : viewReceipts.length === 0 ? (
              <p className="story-viewer__viewers-empty">
                {isLoadingViewReceipts ? "Loading viewers…" : "No views yet."}
              </p>
            ) : (
              <div className="story-viewer__viewers-list">
                {viewReceipts.map((viewer) => (
                  <article className="story-viewer__viewer" key={`${activeStory.id}-${viewer.id}`}>
                    <ProfileAvatar
                      alt={viewer.full_name}
                      className="story-viewer__viewer-avatar"
                      name={viewer.full_name}
                      src={viewer.avatar_url}
                    />
                    <div className="story-viewer__viewer-copy">
                      <strong className="story-viewer__viewer-name">
                        <span className={getIdentityNameClass(viewer.role)}>
                          {viewer.username ? `@${viewer.username}` : viewer.full_name}
                        </span>
                        {viewer.is_verified_artist ? <VerifiedArtistBadge /> : null}
                      </strong>
                      <span>{formatStoryTime(viewer.viewed_at)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </section>
    </div>
  );
};
