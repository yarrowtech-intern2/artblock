import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ThemeSheet } from "../settings/ThemeSheet";
import {
  fetchUnreadMessageCount,
  fetchUnreadNotificationsCount
} from "../../lib/profile";
import { getSupabaseClient } from "../../lib/supabase";
import { useAuth } from "../../providers/AuthProvider";
import { useTheme } from "../../providers/ThemeProvider";
import logoBlack from "../../public/logo/logo-black-transparent.png";
import logoWhite from "../../public/logo/logo-white-transparent.png";

const marketingAnchorLinks = [
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" }
];

const PaletteIcon = () => (
  <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
    <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
    <circle cx="15.5" cy="10" r="1.5" fill="currentColor" />
    <circle cx="12" cy="15" r="1.5" fill="currentColor" />
  </svg>
);

export const Header = () => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isThemeOpen, setThemeOpen] = useState(false);
  const [isLandingScrolled, setLandingScrolled] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { status, profile, signOut, user } = useAuth();
  const location = useLocation();
  const homeTarget = status === "authenticated" ? "/feed" : "/";
  const isAuthed = status === "authenticated";
  const isLanding =
    !isAuthed &&
    (location.pathname === "/" || location.pathname === "/classic-home");
  const { theme } = useTheme();
  const brandLogo = theme === "light" ? logoBlack : logoWhite;

  useEffect(() => {
    if (!isLanding) {
      setLandingScrolled(false);
      return undefined;
    }

    const handleScroll = () => {
      setLandingScrolled(window.scrollY > 18);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isLanding]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase || !user?.id || !isAuthed) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
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
      .channel(`header-unread-${user.id}`)
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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthed, user?.id]);

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <>
      <header
        className={`site-header${isAuthed ? " site-header--authed" : ""}${
          isLanding ? " site-header--landing" : ""
        }${
          isLanding && isLandingScrolled ? " site-header--landing-scrolled" : ""
        }`}
      >
        <div className={`site-header__surface${isMenuOpen ? " site-header__surface--menu-open" : ""}`}>
          <div className="site-header__left">
            <Link className="brand-mark" to={homeTarget}>
              <img alt="ArtBlock" className="brand-mark__image" src={brandLogo} />
            </Link>
            {!isAuthed && (
              <span className="site-header__badge">Creator Platform</span>
            )}
          </div>

          {/* Mobile: authenticated — theme button in left slot, avatar on right */}
          {isAuthed ? (
            <button
              aria-label="Appearance settings"
              className="header-theme-btn"
              onClick={() => setThemeOpen(true)}
              type="button"
            >
              <PaletteIcon />
            </button>
          ) : null}

          {/* Mobile: authenticated users get an avatar link; unauthenticated get hamburger */}
          {isAuthed ? (
            <Link
              aria-label="Your profile"
              className="header-avatar-btn"
              to={`/profiles/${user?.id ?? ""}`}
            >
              {profile?.avatar_url ? (
                <img
                  alt={profile.full_name}
                  className="header-avatar-btn__img"
                  src={profile.avatar_url}
                />
              ) : (
                <span className="header-avatar-btn__fallback">{initials}</span>
              )}
            </Link>
          ) : (
            <button
              aria-expanded={isMenuOpen}
              aria-label="Toggle navigation"
              className="menu-toggle"
              onClick={() => setMenuOpen((c) => !c)}
              type="button"
            >
              <span />
              <span />
              <span />
            </button>
          )}

          {/* Desktop nav for authenticated users (always visible via CSS, hidden on mobile) */}
          {isAuthed ? (
            <nav className="site-nav site-nav--desktop-only">
              <NavLink
                className={({ isActive }) =>
                  `site-nav__link${isActive ? " site-nav__link--active" : ""}`
                }
                to="/feed"
              >
                Feed
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `site-nav__link${isActive ? " site-nav__link--active" : ""}`
                }
                to="/notifications"
              >
                Notifications
                {unreadNotifications > 0 ? (
                  <span className="site-nav__count">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                ) : null}
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `site-nav__link${isActive ? " site-nav__link--active" : ""}`
                }
                to="/messages"
              >
                Messages
                {unreadMessages > 0 ? (
                  <span className="site-nav__count">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                ) : null}
              </NavLink>
              <NavLink
                className={({ isActive }) =>
                  `site-nav__link${isActive ? " site-nav__link--active" : ""}`
                }
                to="/dashboard"
              >
                {profile?.role === "creator" ? "Studio" : "Account"}
              </NavLink>
              <div className="site-nav__actions">
                <button
                  aria-label="Appearance settings"
                  className="header-theme-btn header-theme-btn--nav"
                  onClick={() => setThemeOpen(true)}
                  type="button"
                  title="Change theme"
                >
                  <PaletteIcon />
                </button>
                <button
                  className="ghost-button"
                  onClick={() => void signOut()}
                  type="button"
                >
                  Logout
                </button>
              </div>
            </nav>
          ) : (
            /* Marketing nav with hamburger dropdown */
            <nav className={`site-nav${isMenuOpen ? " site-nav--open" : ""}`}>
              <NavLink
                className={({ isActive }) =>
                  `site-nav__link${isActive ? " site-nav__link--active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
                to="/"
              >
                Home
              </NavLink>
              {marketingAnchorLinks.map((item) => (
                <a
                  className="site-nav__link"
                  href={item.href}
                  key={item.label}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="site-nav__actions">
                <NavLink
                  className="ghost-button"
                  onClick={() => setMenuOpen(false)}
                  to="/login"
                >
                  Login
                </NavLink>
                <NavLink
                  className="solid-button"
                  onClick={() => setMenuOpen(false)}
                  to="/signup"
                >
                  Get Started
                </NavLink>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Theme sheet — rendered outside header so it covers full viewport */}
      <ThemeSheet isOpen={isThemeOpen} onClose={() => setThemeOpen(false)} />
    </>
  );
};
