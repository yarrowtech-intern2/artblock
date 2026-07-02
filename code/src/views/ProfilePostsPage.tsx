import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FeedCard } from "../components/feed/FeedCard";
import { deletePost, fetchProfilePosts, fetchPublicProfileById, fetchPublicProfileBySlug } from "../lib/profile";
import { useAuth } from "../providers/AuthProvider";
import type { FeedPost, PublicProfile } from "../types/auth";

const ProfilePostsSkeleton = () => (
  <div className="feed-skeleton">
    {[1, 2, 3].map((item) => (
      <div className="feed-skeleton__card" key={item}>
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

export const ProfilePostsPage = () => {
  const { id, slug, postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [focusPostId, setFocusPostId] = useState<string | null>(postId ?? null);

  const loadPosts = async (targetProfileId: string) => {
    if (!user?.id) {
      return;
    }

    const postsResult = await fetchProfilePosts(user.id, targetProfileId);
    setPosts(postsResult.data);
    return postsResult.error;
  };

  useEffect(() => {
    setFocusPostId(postId ?? null);
  }, [postId]);

  useEffect(() => {
    const loadPage = async () => {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError(null);

      const profileResult = id ? await fetchPublicProfileById(id) : slug ? await fetchPublicProfileBySlug(slug) : null;

      if (!profileResult?.data) {
        setPublicProfile(null);
        setPosts([]);
        setLoading(false);
        setError(profileResult?.error ?? "Profile unavailable.");
        return;
      }

      setPublicProfile(profileResult.data);
      const postsError = await loadPosts(profileResult.data.id);
      setLoading(false);
      setError(postsError ?? null);
    };

    void loadPage();
  }, [id, slug, user?.id]);

  const orderedPosts = useMemo(() => {
    if (!postId) {
      return posts;
    }

    const targetIndex = posts.findIndex((post) => post.id === postId);

    if (targetIndex <= 0) {
      return posts;
    }

    const targetPost = posts[targetIndex];
    return [targetPost, ...posts.slice(0, targetIndex), ...posts.slice(targetIndex + 1)];
  }, [posts, postId]);

  const profileTarget = publicProfile
    ? publicProfile.creator_slug
      ? `/creators/${publicProfile.creator_slug}`
      : `/profiles/${publicProfile.id}`
    : "/feed";

  if (isLoading) {
    return (
      <section className="profile-posts-page">
        <div className="profile-posts-page__shell">
          <ProfilePostsSkeleton />
        </div>
      </section>
    );
  }

  if (!publicProfile) {
    return (
      <section className="profile-posts-page">
        <div className="profile-posts-page__shell">
          <div className="empty-feed">
            <h2>Profile unavailable.</h2>
            <p>{error ?? "This post stream could not be loaded."}</p>
            <Link className="solid-button" to="/feed">
              Back to feed
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-posts-page">
      <div className="profile-posts-page__shell">
        <header className="profile-posts-page__header">
          <div className="profile-posts-page__copy">
            <span className="section-heading__eyebrow">Profile posts</span>
            <h1>{publicProfile.full_name}</h1>
            <p>{orderedPosts.length} post{orderedPosts.length === 1 ? "" : "s"} from this profile.</p>
          </div>
          <div className="profile-posts-page__actions">
            <Link className="ghost-button" to={profileTarget}>
              Back to profile
            </Link>
          </div>
        </header>

        {error ? <div className="auth-message auth-message--error">{error}</div> : null}

        {orderedPosts.length === 0 ? (
          <div className="empty-feed">
            <h2>No posts yet.</h2>
            <p>This profile has not published anything yet.</p>
            <Link className="solid-button" to={profileTarget}>
              View profile
            </Link>
          </div>
        ) : (
          <div className="profile-posts-page__stream">
            {orderedPosts.map((post) => (
              <FeedCard
                autoFocusKey={focusPostId === post.id ? `profile-post:${post.id}` : null}
                canDelete={post.author_id === user?.id}
                isDeleting={deletingPostId === post.id}
                key={post.id}
                onAutoFocusHandled={() => setFocusPostId(null)}
                onDelete={async (targetPost) => {
                  if (!user?.id) {
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

                  setPosts((current) => current.filter((entry) => entry.id !== targetPost.id));

                  if (targetPost.id === postId) {
                    navigate(profileTarget, { replace: true });
                  }

                  return null;
                }}
                onRefresh={() => loadPosts(publicProfile.id).then((nextError) => {
                  if (nextError) {
                    setError(nextError);
                  } else {
                    setError(null);
                  }
                })}
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
