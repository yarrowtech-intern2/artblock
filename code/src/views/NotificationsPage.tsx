import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileAvatar } from "../components/shared/ProfileAvatar";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../lib/profile";
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

export const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isMutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unreadCount = items.filter((item) => !item.is_read).length;

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
    if (item.is_read) {
      if (item.link) {
        navigate(item.link);
      }
      return;
    }

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
        <h1>Notifications</h1>
        <button
          className="ghost-button"
          disabled={isMutating || unreadCount === 0}
          onClick={() => void handleMarkAllRead()}
          type="button"
        >
          Mark all read
        </button>
      </div>

      {error ? <div className="auth-message auth-message--error">{error}</div> : null}

      {isLoading ? (
        <div className="dashboard-card dashboard-card--compact">
          <p>Loading notifications...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="dashboard-card dashboard-card--compact">
          <p>No notifications yet.</p>
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
                <ProfileAvatar
                  alt={item.actor_full_name ?? "User"}
                  className="feed-card__avatar"
                  name={item.actor_full_name ?? item.actor_username ?? "User"}
                  src={item.actor_avatar_url}
                />
              </div>
              <div className="notification-card__body">
                <div className="notification-card__row">
                  <strong className="notification-card__title">{item.title}</strong>
                  <span className="notification-card__timestamp">{formatDate(item.created_at)}</span>
                  {!item.is_read ? <span aria-hidden="true" className="notification-card__dot" /> : null}
                </div>
                <p className="notification-card__message">{item.body}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
