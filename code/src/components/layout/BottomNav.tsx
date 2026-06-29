import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  fetchUnreadMessageCount,
  fetchUnreadNotificationsCount
} from "../../lib/profile";
import { getSupabaseClient } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { useTheme } from "../../providers/ThemeProvider";
import homeBlackIcon from "../../public/icons/svg/home-black.svg";
import homeWhiteIcon from "../../public/icons/svg/home-white.svg";
import messageBlackIcon from "../../public/icons/svg/message-black.svg";
import messageWhiteIcon from "../../public/icons/svg/message-white.svg";
import notificationBlackIcon from "../../public/icons/svg/notification-black.svg";
import notificationWhiteIcon from "../../public/icons/svg/notification-white.svg";
import reelsBlackIcon from "../../public/icons/svg/reels-black.svg";
import reelsWhiteIcon from "../../public/icons/svg/reels-white.svg";

export const BottomNav = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const isDarkTheme = theme === "dark" || theme === "amoled";

  const iconSrc = {
    home: isDarkTheme ? homeWhiteIcon : homeBlackIcon,
    message: isDarkTheme ? messageWhiteIcon : messageBlackIcon,
    notification: isDarkTheme ? notificationWhiteIcon : notificationBlackIcon,
    reels: isDarkTheme ? reelsWhiteIcon : reelsBlackIcon
  };

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
          <img alt="" aria-hidden="true" className="bottom-nav__icon-image" src={iconSrc.home} />
        )}

        {navItem(
          "/shorts",
          "Shorts",
          <img alt="" aria-hidden="true" className="bottom-nav__icon-image" src={iconSrc.reels} />
        )}

        <NavLink
          to={{ pathname: "/dashboard", hash: "#posting" }}
          className="bottom-nav__create"
          aria-label="Create post"
        >
          <span className="bottom-nav__create-btn">
            <svg aria-hidden="true" fill="none" height="26" viewBox="0 0 24 24" width="26">
              <line stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" x1="12" x2="12" y1="5" y2="19" />
              <line stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" x1="5" x2="19" y1="12" y2="12" />
            </svg>
          </span>
        </NavLink>

        {navItem(
          "/messages",
          "DMs",
          <img
            alt=""
            aria-hidden="true"
            className="bottom-nav__icon-image"
            src={iconSrc.message}
          />,
          unreadMessages
        )}

        {navItem(
          "/notifications",
          "Alerts",
          <img
            alt=""
            aria-hidden="true"
            className="bottom-nav__icon-image"
            src={iconSrc.notification}
          />,
          unreadNotifications
        )}
      </div>
    </nav>
  );
};
