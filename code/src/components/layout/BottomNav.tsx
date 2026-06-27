import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  fetchUnreadMessageCount,
  fetchUnreadNotificationsCount
} from "../../lib/profile";
import { getSupabaseClient } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";

export const BottomNav = () => {
  const { user, profile } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !user?.id) {
      return;
    }

    const refresh = async () => {
      const [msgResult, notifResult] = await Promise.all([
        fetchUnreadMessageCount(user.id),
        fetchUnreadNotificationsCount(user.id)
      ]);

      if (!msgResult.error) setUnreadMessages(msgResult.data);
      if (!notifResult.error) setUnreadNotifications(notifResult.data);
    };

    void refresh();

    const channel = supabase
      .channel(`bottom-nav-unread-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_thread_members", filter: `user_id=eq.${user.id}` },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` },
        () => void refresh()
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

  const navItem = (
    to: string,
    label: string,
    icon: React.ReactNode,
    badge?: number
  ) => (
    <NavLink
      aria-label={label}
      className={({ isActive }) =>
        `bottom-nav__item${isActive ? " bottom-nav__item--active" : ""}`
      }
      to={to}
    >
      <span className="bottom-nav__icon-wrap">
        {icon}
        {badge && badge > 0 ? (
          <span className="bottom-nav__badge">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
    </NavLink>
  );

  return (
    <nav aria-label="Main navigation" className="bottom-nav">
      <div className="bottom-nav__items">
        {navItem(
          "/feed",
          "Feed",
          <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
            <path
              d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <polyline
              points="9,22 9,12 15,12 15,22"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        )}

        {navItem(
          "/notifications",
          "Alerts",
          <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
            <path
              d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path
              d="M13.73 21a2 2 0 01-3.46 0"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>,
          unreadNotifications
        )}

        <NavLink to="/dashboard" className="bottom-nav__create" aria-label="Create">
          <span className="bottom-nav__create-btn">
            <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
              <line stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" x1="12" x2="12" y1="5" y2="19" />
              <line stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" x1="5" x2="19" y1="12" y2="12" />
            </svg>
          </span>
        </NavLink>

        {navItem(
          "/messages",
          "DMs",
          <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
            <path
              d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>,
          unreadMessages
        )}

        {user
          ? navItem(
              `/profiles/${user.id}`,
              "Profile",
              <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
                <path
                  d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <circle
                  cx="12"
                  cy="7"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            )
          : null}
      </div>
    </nav>
  );
};
