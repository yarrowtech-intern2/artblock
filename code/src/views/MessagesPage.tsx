import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProfileAvatar } from "../components/shared/ProfileAvatar";
import {
  fetchDirectMessages,
  fetchInboxThreads,
  markThreadRead,
  sendDirectMessage
} from "../lib/profile";
import { VerifiedArtistBadge } from "../components/shared/VerifiedArtistBadge";
import { getIdentityNameClass } from "../lib/identity";
import { getSupabaseClient } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";
import type { DirectMessage, InboxThread } from "../types/auth";

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(value))
    : "No messages yet";

export const MessagesPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setLoading] = useState(true);
  const [isSending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const activeThreadId = searchParams.get("thread");
  const activeThread = useMemo(
    () => threads.find((thread) => thread.thread_id === activeThreadId) ?? null,
    [threads, activeThreadId]
  );
  const hasActiveThread = Boolean(activeThread);

  const loadThreads = async () => {
    setLoading(true);
    setError(null);
    const result = await fetchInboxThreads();
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setThreads(result.data);

    if (
      !activeThreadId &&
      result.data[0] &&
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      setSearchParams({ thread: result.data[0].thread_id });
    }
  };

  const loadMessages = async (threadId: string) => {
    setError(null);
    const result = await fetchDirectMessages(threadId);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMessages(result.data);
  };

  useEffect(() => {
    void loadThreads();
  }, []);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }

    void loadMessages(activeThreadId);
  }, [activeThreadId]);

  useEffect(() => {
    if (!activeThreadId || !user?.id) {
      return;
    }

    void markThreadRead(activeThreadId).then(() => {
      void loadThreads();
    });
  }, [activeThreadId, user?.id]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, activeThreadId]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !user?.id) {
      return;
    }

    const threadsChannel = supabase
      .channel(`messages-members-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_thread_members",
          filter: `user_id=eq.${user.id}`
        },
        () => {
          void loadThreads();
        }
      )
      .subscribe();

    const activeThreadChannel =
      activeThreadId
        ? supabase
            .channel(`messages-thread-${activeThreadId}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "direct_messages",
                filter: `thread_id=eq.${activeThreadId}`
              },
              () => {
                void Promise.all([
                  loadMessages(activeThreadId),
                  markThreadRead(activeThreadId),
                  loadThreads()
                ]);
              }
            )
            .subscribe()
        : null;

    return () => {
      void supabase.removeChannel(threadsChannel);

      if (activeThreadChannel) {
        void supabase.removeChannel(activeThreadChannel);
      }
    };
  }, [activeThreadId, user?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !activeThreadId) {
      return;
    }

    const trimmed = draft.trim();

    if (!trimmed) {
      setError("Message cannot be empty.");
      return;
    }

    setSending(true);
    setError(null);
    const result = await sendDirectMessage(activeThreadId, user.id, trimmed);
    setSending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDraft("");
    await Promise.all([loadThreads(), loadMessages(activeThreadId)]);
  };

  return (
    <section className="messages-page">
      <div className="messages-shell">
        <aside className={`messages-sidebar ${hasActiveThread ? "messages-sidebar--hidden-mobile" : ""}`}>
          <div className="messages-sidebar__top">
            <div>
              <span className="section-heading__eyebrow">Inbox</span>
              <h2>Messages</h2>
            </div>
            <Link className="ghost-button" to="/feed">
              Feed
            </Link>
          </div>

          <div className="messages-search">
            <input aria-label="Search threads" placeholder="Search threads" type="search" />
          </div>

          {isLoading ? (
            <div className="feed-rail-card">
              <p>Loading threads...</p>
            </div>
          ) : threads.length === 0 ? (
            <div className="feed-rail-card">
              <h2>No messages yet</h2>
              <p>Visit a profile and tap Message to start a direct thread.</p>
              <Link className="solid-button" to="/feed">
                Back to feed
              </Link>
            </div>
          ) : (
            <div className="messages-thread-list">
              {threads.map((thread) => (
                <button
                  className={`messages-thread-card ${
                    thread.thread_id === activeThreadId ? "messages-thread-card--active" : ""
                  }`}
                  key={thread.thread_id}
                  onClick={() => setSearchParams({ thread: thread.thread_id })}
                  type="button"
                >
                  <div className="messages-thread-card__avatar">
                    <ProfileAvatar
                      alt={thread.peer_full_name}
                      className="feed-card__avatar"
                      name={thread.peer_full_name}
                      src={thread.peer_avatar_url}
                    />
                  </div>
                  <div className="messages-thread-card__body">
                    <div className="messages-thread-card__row">
                      <strong>
                        <span className={getIdentityNameClass(thread.peer_role)}>
                          {thread.peer_username ? `@${thread.peer_username}` : thread.peer_full_name}
                        </span>
                        {thread.peer_is_verified_artist ? <VerifiedArtistBadge /> : null}
                      </strong>
                      <div className="messages-thread-card__meta">
                        {thread.unread_count > 0 ? (
                          <span className="messages-thread-card__badge">
                            {thread.unread_count > 99 ? "99+" : thread.unread_count}
                          </span>
                        ) : null}
                        <span>{formatDate(thread.last_message_created_at)}</span>
                      </div>
                    </div>
                    <p>{thread.last_message_body ?? "Start the conversation."}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className={`messages-main ${hasActiveThread ? "messages-main--active-mobile" : ""}`}>
          {activeThread ? (
            <>
              <div className="messages-header">
                <div className="messages-header__left">
                  <button
                    className="messages-back-button"
                    onClick={() => setSearchParams({})}
                    type="button"
                  >
                    Back
                  </button>

                  <div className="feed-card__identity">
                    <ProfileAvatar
                      alt={activeThread.peer_full_name}
                      className="feed-card__avatar"
                      name={activeThread.peer_full_name}
                      src={activeThread.peer_avatar_url}
                    />

                    <div>
                      <strong className="profile-name-row">
                        <span className={getIdentityNameClass(activeThread.peer_role)}>{activeThread.peer_full_name}</span>
                        {activeThread.peer_is_verified_artist ? <VerifiedArtistBadge /> : null}
                      </strong>
                      <p>
                        {activeThread.peer_username ? `@${activeThread.peer_username}` : activeThread.peer_role}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="messages-header__actions">
                  <span className="messages-header__status">Active thread</span>
                  <Link className="ghost-button messages-header__profile-link" to={`/profiles/${activeThread.peer_id}`}>
                    View profile
                  </Link>
                </div>
              </div>

              {error ? <div className="auth-message auth-message--error">{error}</div> : null}

              <div className="messages-stream">
                {messages.length === 0 ? (
                  <div className="empty-feed">
                    <h2>No messages yet.</h2>
                    <p>Send the first note to start this conversation.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = user?.id === message.sender_id;

                    return (
                      <article
                        className={`message-bubble ${isOwn ? "message-bubble--own" : ""}`}
                        key={message.id}
                      >
                        <strong className={!isOwn ? "profile-name-row" : undefined}>
                          {isOwn ? (
                            "You"
                          ) : (
                            <span className={getIdentityNameClass(message.sender_role)}>
                              {message.username ? `@${message.username}` : message.full_name}
                            </span>
                          )}
                          {!isOwn && message.is_verified_artist ? <VerifiedArtistBadge /> : null}
                        </strong>
                        <p>{message.body}</p>
                        <span>{formatDate(message.created_at)}</span>
                      </article>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              <form className="messages-composer" onSubmit={handleSubmit}>
                <div className="messages-composer__row">
                  <textarea
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a direct message"
                    rows={1}
                    value={draft}
                  />
                  <button className="solid-button messages-send-button" disabled={isSending} type="submit">
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="messages-empty-state">
              <div className="messages-empty-state__card">
                <span className="section-heading__eyebrow">Chat Ready</span>
                <h2>Select a thread</h2>
                <p>Choose a conversation to open the message stream, or start from a public profile.</p>
                <Link className="solid-button" to="/feed">
                  Explore profiles
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
