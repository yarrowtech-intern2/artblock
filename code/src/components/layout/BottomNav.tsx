import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  fetchUnreadMessageCount,
  fetchUnreadNotificationsCount
} from "../../lib/profile";
import {
  BellNavIcon,
  HomeNavIcon,
  MessageNavIcon,
  ReelsNavIcon
} from "../shared/NavIcons";
import { getSupabaseClient } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { CreateOptionsMenu } from "../create/CreateOptionsMenu";

export const BottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isCreateMenuOpen, setCreateMenuOpen] = useState(false);

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

  useEffect(() => {
    setCreateMenuOpen(false);
  }, [location.pathname, location.search]);

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
          <HomeNavIcon aria-hidden="true" className="bottom-nav__icon-image" />
        )}

        {navItem(
          "/shorts",
          "Shorts",
          <ReelsNavIcon aria-hidden="true" className="bottom-nav__icon-image" />
        )}

        <div className="bottom-nav__create">
          {isCreateMenuOpen ? (
            <CreateOptionsMenu
              className="bottom-nav__create-menu"
              compact
              onSelect={() => setCreateMenuOpen(false)}
            />
          ) : null}
          <button
            aria-expanded={isCreateMenuOpen}
            aria-label="Open create menu"
            className="bottom-nav__create-btn"
            onClick={() => setCreateMenuOpen((current) => !current)}
            type="button"
          >
            <svg aria-hidden="true" fill="none" height="26" viewBox="0 0 24 24" width="26">
              <line stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" x1="12" x2="12" y1="5" y2="19" />
              <line stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" x1="5" x2="19" y1="12" y2="12" />
            </svg>
          </button>
        </div>

        {navItem(
          "/messages",
          "DMs",
          <MessageNavIcon aria-hidden="true" className="bottom-nav__icon-image" />,
          unreadMessages
        )}

        {navItem(
          "/notifications",
          "Alerts",
          <BellNavIcon aria-hidden="true" className="bottom-nav__icon-image" />,
          unreadNotifications
        )}
      </div>
    </nav>
  );
};
