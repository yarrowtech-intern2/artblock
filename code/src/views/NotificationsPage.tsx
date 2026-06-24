import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../lib/profile";
import { VerifiedArtistBadge } from "../components/shared/VerifiedArtistBadge";
import { getSupabaseClient } from "../lib/supabase";
import { useAuth } from "../providers/AuthProvider";
import type { NotificationItem } from "../types/auth";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));

const getInitials = (value: string | null) =>
  (value ?? "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isMutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    const result = await fetchNotifications();
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setItems(result.data);
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !user?.id) {
      return;
    }

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleOpen = async (item: NotificationItem) => {
    setMutating(true);
    const result = await markNotificationRead(item.id);
    setMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, is_read: true } : entry))
    );

    if (item.link) {
      navigate(item.link);
    }
  };

  const handleMarkAllRead = async () => {
    setMutating(true);
    const result = await markAllNotificationsRead();
    setMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setItems((current) => current.map((entry) => ({ ...entry, is_read: true })));
  };

  return (
    <section className="notifications-page">
      <div className="notifications-page__header">
        <div>
          <span className="section-heading__eyebrow">Notifications</span>
          <h1>Activity inbox</h1>
          <p>Track follows, subscriptions, messages, and engagement without leaving the app shell.</p>
        </div>
        <button
          className="ghost-button"
          disabled={isMutating || items.every((item) => item.is_read)}
          onClick={() => void handleMarkAllRead()}
          type="button"
        >
          Mark all read
        </button>
      </div>

      {error ? <div className="auth-message auth-message--error">{error}</div> : null}

      {isLoading ? (
        <div className="dashboard-card">
          <p>Loading notifications...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-feed">
          <h2>No notifications yet.</h2>
          <p>Once people interact with your profile, feed, or inbox, updates will appear here.</p>
          <Link className="solid-button" to="/feed">
            Back to feed
          </Link>
        </div>
      ) : (
        <div className="notifications-list">
          {items.map((item) => (
            <button
              className={`notification-card ${item.is_read ? "" : "notification-card--unread"}`}
              key={item.id}
              onClick={() => void handleOpen(item)}
              type="button"
            >
              <div className="notification-card__avatar">
                {item.actor_avatar_url ? (
                  <img alt={item.actor_full_name ?? "User"} className="feed-card__avatar" src={item.actor_avatar_url} />
                ) : (
                  <div className="feed-card__avatar feed-card__avatar--fallback">
                    {getInitials(item.actor_full_name)}
                  </div>
                )}
              </div>
                <div className="notification-card__body">
                  <div className="notification-card__row">
                    <strong>{item.title}</strong>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                <p>{item.body}</p>
                {item.actor_full_name ? (
                  <span className="notification-card__actor profile-name-row">
                    {item.actor_username ? `@${item.actor_username}` : item.actor_full_name}
                    {item.actor_is_verified_artist ? <VerifiedArtistBadge /> : null}
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
