import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShortCard } from "../components/shorts/ShortCard";
import { ShortsComposer } from "../components/shorts/ShortsComposer";
import {
  addComment,
  createArtistTipOrder,
  fetchShortPosts,
  verifyArtistTipPayment
} from "../lib/profile";
import { loadRazorpayCheckout } from "../lib/razorpay";
import { useAuth } from "../providers/AuthProvider";
import type { ShortPost } from "../types/auth";

const SHORTS_PAGE_SIZE = 4;
const TIP_PRESETS = [100, 250, 500, 1000];

export const ShortsPage = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<ShortPost[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [isSubmittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [tipPostId, setTipPostId] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState("100");
  const [tipMessage, setTipMessage] = useState("");
  const [isStartingTip, setStartingTip] = useState(false);
  const [tipError, setTipError] = useState<string | null>(null);
  const itemNodesRef = useRef<Record<string, HTMLDivElement | null>>({});
  const feedRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isComposerOpen = searchParams.get("compose") === "1";

  const commentPost = useMemo(
    () => posts.find((post) => post.id === commentPostId) ?? null,
    [commentPostId, posts]
  );
  const tipPost = useMemo(
    () => posts.find((post) => post.id === tipPostId) ?? null,
    [posts, tipPostId]
  );

  const syncComposerQuery = (nextOpen: boolean) => {
    const nextParams = new URLSearchParams(searchParams);

    if (nextOpen) {
      nextParams.set("compose", "1");
    } else {
      nextParams.delete("compose");
    }

    setSearchParams(nextParams, { replace: true });
  };

  const loadShorts = async ({
    page: nextPage = 0,
    append = false
  }: {
    page?: number;
    append?: boolean;
  } = {}) => {
    if (!user?.id) {
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    const result = await fetchShortPosts(user.id, {
      page: nextPage,
      pageSize: SHORTS_PAGE_SIZE
    });

    if (append) {
      setLoadingMore(false);
    } else {
      setLoading(false);
    }

    if (result.error) {
      setError(result.error);
      return;
    }

    setHasMore(result.hasMore);
    setPage(nextPage);
    setPosts((current) => {
      if (!append) {
        return result.data;
      }

      const seenIds = new Set(current.map((post) => post.id));
      return [...current, ...result.data.filter((post) => !seenIds.has(post.id))];
    });
    setActivePostId((current) => current ?? result.data[0]?.id ?? null);
  };

  useEffect(() => {
    setPosts([]);
    setHasMore(false);
    setPage(0);
    void loadShorts({ page: 0, append: false });
  }, [user?.id]);

  useEffect(() => {
    const root = feedRef.current;
    const nodes = posts
      .map((post) => itemNodesRef.current[post.id])
      .filter((node): node is HTMLDivElement => Boolean(node));

    if (!root || nodes.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (intersectionEntries) => {
        const mostVisible = intersectionEntries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (mostVisible?.target instanceof HTMLDivElement) {
          const shortId = mostVisible.target.dataset.shortId;

          if (shortId) {
            setActivePostId(shortId);
          }
        }
      },
      {
        root,
        threshold: [0.45, 0.7, 0.9]
      }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [posts]);

  useEffect(() => {
    const root = feedRef.current;
    const sentinel = sentinelRef.current;

    if (!root || !sentinel || isLoading || isLoadingMore || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void loadShorts({ page: page + 1, append: true });
        }
      },
      {
        root,
        rootMargin: "180px 0px"
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, page, user?.id]);

  const handleCommentSubmit = async (event: { preventDefault(): void }) => {
    event.preventDefault();

    if (!user?.id || !commentPost) {
      return;
    }

    const trimmed = commentDraft.trim();

    if (!trimmed) {
      return;
    }

    setSubmittingComment(true);
    setCommentError(null);
    const result = await addComment(commentPost.id, user.id, trimmed);
    setSubmittingComment(false);

    if (result.error) {
      setCommentError(result.error);
      return;
    }

    setCommentDraft("");
    await loadShorts({ page: 0, append: false });
  };

  const handleStartTip = async () => {
    if (!user?.id || !profile || !tipPost) {
      return;
    }

    const amountRupees = Number(tipAmount);

    if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
      setTipError("Enter a valid tip amount.");
      return;
    }

    setStartingTip(true);
    setTipError(null);

    const checkoutLoaded = await loadRazorpayCheckout();

    if (!checkoutLoaded || !window.Razorpay) {
      setStartingTip(false);
      setTipError("Razorpay Checkout could not be loaded.");
      return;
    }

    const orderResult = await createArtistTipOrder({
      postId: tipPost.id,
      recipientId: tipPost.author_id,
      amountRupees,
      message: tipMessage.trim() || null
    });

    if (orderResult.error || !orderResult.data) {
      setStartingTip(false);
      setTipError(orderResult.error ?? "Unable to start the tip payment.");
      return;
    }

    const razorpay = new window.Razorpay({
      key: orderResult.data.keyId,
      amount: orderResult.data.amount,
      currency: orderResult.data.currency,
      name: "ArtBlock",
      description: `Tip ${orderResult.data.recipientName}`,
      order_id: orderResult.data.orderId,
      prefill: {
        name: profile.full_name,
        email: profile.email
      },
      theme: {
        color: "#5f61f2"
      },
      modal: {
        ondismiss: () => {
          setStartingTip(false);
        }
      },
      handler: async (response) => {
        const verifyResult = await verifyArtistTipPayment({
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature
        });

        setStartingTip(false);

        if (verifyResult.error) {
          setTipError(verifyResult.error);
          return;
        }

        setTipMessage("");
        setTipAmount("100");
        setTipPostId(null);
        await loadShorts({ page: 0, append: false });
      }
    });

    razorpay.open();
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/feed");
  };

  return (
    <section className="shorts-page shorts-page--immersive">
      {error ? <div className="shorts-page__error auth-message auth-message--error">{error}</div> : null}

      <div className="shorts-feed" ref={feedRef}>
        {isLoading ? (
          <div className="shorts-empty">
            <strong>Loading reels...</strong>
          </div>
        ) : null}

        {!isLoading && posts.length === 0 ? (
          <div className="shorts-empty">
            <strong>No reels yet</strong>
            <p>Upload the first short-form post from your gallery or camera.</p>
            <div className="shorts-empty__actions">
              <button className="solid-button" onClick={() => syncComposerQuery(true)} type="button">
                Upload your first reel
              </button>
              <Link className="ghost-button" to="/feed">
                Back to feed
              </Link>
            </div>
          </div>
        ) : null}

        {posts.map((post) => (
          <div
            className="shorts-feed__item"
            data-short-id={post.id}
            key={post.id}
            ref={(node) => {
              if (node) {
                itemNodesRef.current[post.id] = node;
                return;
              }

              delete itemNodesRef.current[post.id];
            }}
          >
            <ShortCard
              isActive={activePostId === post.id}
              onBack={handleBack}
              onOpenComments={(targetPost) => {
                setCommentError(null);
                setCommentPostId(targetPost.id);
              }}
              onOpenTip={(targetPost) => {
                setTipError(null);
                setTipPostId(targetPost.id);
              }}
              post={post}
              viewerId={user?.id ?? ""}
            />
          </div>
        ))}

        {!isLoading && posts.length > 0 ? <div className="shorts-feed__sentinel" ref={sentinelRef} /> : null}

        {isLoadingMore ? (
          <div className="shorts-feed__loading">
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>

      <ShortsComposer
        isOpen={isComposerOpen}
        onClose={() => syncComposerQuery(false)}
        onCreated={() => loadShorts({ page: 0, append: false })}
        userId={user?.id ?? ""}
      />

      {commentPost ? (
        <div className="shorts-sheet" role="dialog" aria-modal="true" aria-labelledby="shorts-comments-title">
          <div className="shorts-sheet__backdrop" onClick={() => setCommentPostId(null)} />
          <section className="shorts-sheet__panel">
            <div className="shorts-sheet__header">
              <div>
                <span className="section-heading__eyebrow">Comments</span>
                <h2 id="shorts-comments-title">{commentPost.title ?? commentPost.full_name}</h2>
              </div>
              <button className="ghost-button" onClick={() => setCommentPostId(null)} type="button">
                Close
              </button>
            </div>

            <div className="shorts-comments__list">
              {commentError ? <div className="auth-message auth-message--error">{commentError}</div> : null}
              {commentPost.comments.length === 0 ? (
                <p className="shorts-comments__empty">No comments yet. Start the conversation.</p>
              ) : null}
              {commentPost.comments.map((comment) => (
                <article className="shorts-comment" key={comment.id}>
                  <strong>{comment.username ? `@${comment.username}` : comment.full_name}</strong>
                  <p>{comment.body}</p>
                </article>
              ))}
            </div>

            <form className="shorts-comments__composer" onSubmit={handleCommentSubmit}>
              <input
                maxLength={500}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="Add a comment..."
                type="text"
                value={commentDraft}
              />
              <button className="solid-button" disabled={isSubmittingComment || !commentDraft.trim()} type="submit">
                {isSubmittingComment ? "Posting..." : "Post"}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {tipPost ? (
        <div className="shorts-sheet" role="dialog" aria-modal="true" aria-labelledby="shorts-tip-title">
          <div className="shorts-sheet__backdrop" onClick={() => setTipPostId(null)} />
          <section className="shorts-sheet__panel">
            <div className="shorts-sheet__header">
              <div>
                <span className="section-heading__eyebrow">Tip Artist</span>
                <h2 id="shorts-tip-title">{tipPost.full_name}</h2>
              </div>
              <button className="ghost-button" onClick={() => setTipPostId(null)} type="button">
                Close
              </button>
            </div>

            {tipError ? <div className="auth-message auth-message--error">{tipError}</div> : null}

            <div className="shorts-tip">
              <div className="shorts-tip__presets">
                {TIP_PRESETS.map((value) => (
                  <button
                    className={`ghost-button${tipAmount === String(value) ? " shorts-tip__preset--active" : ""}`}
                    key={value}
                    onClick={() => setTipAmount(String(value))}
                    type="button"
                  >
                    Rs {value}
                  </button>
                ))}
              </div>

              <label className="shorts-tip__field">
                Amount
                <input
                  min="10"
                  onChange={(event) => setTipAmount(event.target.value)}
                  step="1"
                  type="number"
                  value={tipAmount}
                />
              </label>

              <label className="shorts-tip__field">
                Message
                <textarea
                  maxLength={240}
                  onChange={(event) => setTipMessage(event.target.value)}
                  placeholder="Optional note for the artist"
                  rows={3}
                  value={tipMessage}
                />
              </label>

              <button className="solid-button" disabled={isStartingTip} onClick={() => void handleStartTip()} type="button">
                {isStartingTip ? "Opening checkout..." : "Continue to payment"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
};
