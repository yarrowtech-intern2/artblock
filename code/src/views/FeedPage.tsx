import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FeedCard } from "../components/feed/FeedCard";
import { FeedTopTabs } from "../components/feed/FeedTopTabs";
import { VerifiedArtistBadge } from "../components/shared/VerifiedArtistBadge";
import { getIdentityNameClass } from "../lib/identity";
import { deletePost, fetchFeedPosts, type FeedScope } from "../lib/profile";
import { useAuth } from "../providers/AuthProvider";
import type { FeedPost } from "../types/auth";
import { useSearchParams } from "react-router-dom";

const FEED_PAGE_SIZE = 6;
const isFeedScope = (value: string | null): value is FeedScope =>
  value === "for-you" || value === "following" || value === "subscribed" || value === "saved";

const FeedSkeleton = () => (
  <div className="feed-skeleton">
    {[1, 2, 3].map((i) => (
      <div className="feed-skeleton__card" key={i}>
        <div className="feed-skeleton__header">
          <div className="feed-skeleton__avatar shimmer" />
          <div className="feed-skeleton__lines">
            <div className="feed-skeleton__line shimmer" style={{ width: "55%" }} />
            <div className="feed-skeleton__line shimmer" style={{ width: "35%" }} />
          </div>
        </div>
        <div className="feed-skeleton__media shimmer" />
        <div className="feed-skeleton__footer">
          <div className="feed-skeleton__line shimmer" style={{ width: "30%" }} />
        </div>
      </div>
    ))}
  </div>
);

export const FeedPage = () => {
  const { profile, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRouteScope = searchParams.get("tab");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [feedScope, setFeedScope] = useState<FeedScope>(
    isFeedScope(initialRouteScope) ? initialRouteScope : "for-you"
  );
  const [isLoading, setLoading] = useState(true);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const routeScope = searchParams.get("tab");
    const nextScope = isFeedScope(routeScope) ? routeScope : "for-you";
    setFeedScope(nextScope);
  }, [searchParams]);

  const loadFeed = async ({
    scope = feedScope,
    page: nextPage = 0,
    append = false
  }: {
    scope?: FeedScope;
    page?: number;
    append?: boolean;
  } = {}) => {
    if (!user) return;

    if (append) setLoadingMore(true);
    else setLoading(true);

    if (!append) setError(null);

    const result = await fetchFeedPosts(user.id, scope, {
      page: nextPage,
      pageSize: FEED_PAGE_SIZE
    });

    if (append) setLoadingMore(false);
    else setLoading(false);

    if (result.error) { setError(result.error); return; }

    setHasMore(result.hasMore);
    setPage(nextPage);
    setPosts((current) => {
      if (!append) return result.data;
      const seenIds = new Set(current.map((post) => post.id));
      return [...current, ...result.data.filter((post) => !seenIds.has(post.id))];
    });
  };

  useEffect(() => {
    setPosts([]);
    setPage(0);
    setHasMore(false);
    void loadFeed({ scope: feedScope, page: 0, append: false });
  }, [user?.id, feedScope]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void loadFeed({ scope: feedScope, page: page + 1, append: true });
        }
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [feedScope, hasMore, isLoading, isLoadingMore, page, user?.id]);

  const emptyFeedCopy =
    feedScope === "following"
      ? "Follow a few profiles to build a relationship-based feed."
      : feedScope === "subscribed"
        ? "Subscribe to creators to unlock a dedicated subscription stream."
        : feedScope === "saved"
          ? "Save posts from the feed to build a private reading list."
          : profile?.role === "creator"
            ? "Create the first post below, or publish from your profile studio."
            : "Once creators publish content, it will appear here.";

  return (
    <section className="feed-page">
      <div className="feed-shell">
        {/* Left sidebar — desktop only */}
        <aside className="feed-sidebar feed-sidebar--left">
          <div className="feed-rail-card">
            <span className="section-heading__eyebrow">Profile</span>
            <h2 className="profile-name-row">
              <span className={getIdentityNameClass(profile?.role)}>{profile?.full_name ?? "Account"}</span>
              {profile?.is_verified_artist ? <VerifiedArtistBadge /> : null}
            </h2>
            <p>{profile?.bio ?? "Set your profile details to improve how you appear across the platform."}</p>
            <div className="feed-rail-meta">
              <span>{profile?.role === "creator" ? "Creator" : "Visitor"}</span>
              <span>{profile?.username ? `@${profile.username}` : "No username yet"}</span>
            </div>
            <div className="feed-rail-actions">
              <Link className="ghost-button" to={`/profiles/${user?.id ?? ""}`}>
                View Profile
              </Link>
              <Link className="ghost-button" to="/dashboard">
                {profile?.role === "creator" ? "Open Studio" : "Open Account"}
              </Link>
            </div>
          </div>
        </aside>

        {/* Main feed column */}
        <div className="feed-main">
          {/* Compact tab bar */}
          <FeedTopTabs
            activeFeedScope={feedScope}
            onFeedScopeChange={(scope) => {
              setFeedScope(scope);
              const nextParams = new URLSearchParams(searchParams);

              if (scope === "for-you") {
                nextParams.delete("tab");
              } else {
                nextParams.set("tab", scope);
              }

              setSearchParams(nextParams, { replace: true });
            }}
            sticky={false}
          />

          {error ? <div className="auth-message auth-message--error">{error}</div> : null}

          {isLoading ? <FeedSkeleton /> : null}

          {!isLoading && posts.length === 0 ? (
            <div className="empty-feed">
              <div className="empty-feed__icon" aria-hidden="true">
                <svg fill="none" height="40" viewBox="0 0 24 24" width="40">
                  <rect height="18" rx="3" stroke="currentColor" strokeWidth="1.5" width="15" x="4.5" y="3" />
                  <line stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" x1="8" x2="16" y1="8" y2="8" />
                  <line stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" x1="8" x2="14" y1="12" y2="12" />
                  <line stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" x1="8" x2="12" y1="16" y2="16" />
                </svg>
              </div>
              <span className="section-heading__eyebrow">Nothing here yet</span>
              <h2>The feed is empty.</h2>
              <p>{emptyFeedCopy}</p>
              <Link className="solid-button" to="/dashboard">
                {profile?.role === "creator" ? "Open Studio" : "Open Account"}
              </Link>
            </div>
          ) : null}

          <div className="feed-grid">
            {posts.map((post) => (
              <FeedCard
                canDelete={post.author_id === user?.id}
                isDeleting={deletingPostId === post.id}
                key={post.id}
                onDelete={async (targetPost) => {
                  if (!user) {
                    return "You need to sign in to delete posts.";
                  }

                  setDeletingPostId(targetPost.id);
                  setError(null);
                  const result = await deletePost(targetPost.id, user.id);
                  setDeletingPostId(null);

                  if (result.error) {
                    setError(result.error);
                    return result.error;
                  }

                  setPosts((current) => current.filter((item) => item.id !== targetPost.id));
                  return null;
                }}
                onRefresh={() => loadFeed({ scope: feedScope, page: 0, append: false })}
                post={post}
                viewerId={user?.id ?? ""}
              />
            ))}
          </div>

          {!isLoading && posts.length > 0 ? <div className="feed-sentinel" ref={sentinelRef} /> : null}

          {isLoadingMore ? (
            <div className="feed-loading feed-loading--inline">
              <div className="feed-loading__dot" />
              <div className="feed-loading__dot" />
              <div className="feed-loading__dot" />
            </div>
          ) : null}

          {!isLoading && !hasMore && posts.length > 0 ? (
            <div className="feed-end-cap">
              <span>·</span>
              <span className="section-heading__eyebrow">You're all caught up</span>
              <span>·</span>
            </div>
          ) : null}
        </div>

        {/* Right sidebar — desktop only */}
        <aside className="feed-sidebar feed-sidebar--right">
          {profile?.role === "creator" ? (
            <div className="feed-rail-card feed-create-card">
              <h2>Create a Post</h2>
              <p>Post an Image, video, poll or Text</p>
              <div className="feed-create-card__actions">
                <Link className="solid-button" to={{ pathname: "/dashboard", hash: "#posting" }}>
                  Post Content
                </Link>
                <Link
                  aria-label="Create post"
                  className="feed-create-card__plus"
                  to={{ pathname: "/dashboard", hash: "#posting" }}
                >
                  <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
                    <line stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" x1="12" x2="12" y1="5" y2="19" />
                    <line stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" x1="5" x2="19" y1="12" y2="12" />
                  </svg>
                </Link>
              </div>
            </div>
          ) : (
            <div className="feed-rail-card">
              <span className="section-heading__eyebrow">Live Summary</span>
              <h2>Feed pulse</h2>
              <div className="feed-rail-stats">
                <article>
                  <span>Posts</span>
                  <strong>{posts.length}</strong>
                </article>
                <article>
                  <span>Creators</span>
                  <strong>{new Set(posts.map((p) => p.author_id)).size}</strong>
                </article>
              </div>
            </div>
          )}

          <div className="feed-rail-card">
            <span className="section-heading__eyebrow">Quick Links</span>
            <div className="feed-rail-actions">
              <Link className="ghost-button" to="/messages">Messages</Link>
              <Link className="ghost-button" to="/dashboard">
                {profile?.role === "creator" ? "Profile Studio" : "Account"}
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
