import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../providers/ThemeProvider";
import type { FeedScope } from "../../lib/profile";
import forYouBlackIcon from "../../public/icons/svg/for-you-black.svg";
import forYouWhiteIcon from "../../public/icons/svg/for-you-white.svg";
import followingBlackIcon from "../../public/icons/svg/following-black.svg";
import followingWhiteIcon from "../../public/icons/svg/following-white.svg";
import subscribedBlackIcon from "../../public/icons/svg/subscribed-black.svg";
import subscribedWhiteIcon from "../../public/icons/svg/subscribed-white.svg";
import savedBlackIcon from "../../public/icons/svg/saved-black.svg";
import savedWhiteIcon from "../../public/icons/svg/saved-white.svg";

const FEED_TABS: {
  label: string;
  value: FeedScope;
  icons: {
    light: string;
    dark: string;
  };
}[] = [
  {
    label: "For You",
    value: "for-you",
    icons: { light: forYouBlackIcon, dark: forYouWhiteIcon }
  },
  {
    label: "Following",
    value: "following",
    icons: { light: followingBlackIcon, dark: followingWhiteIcon }
  },
  {
    label: "Subscribed",
    value: "subscribed",
    icons: { light: subscribedBlackIcon, dark: subscribedWhiteIcon }
  },
  {
    label: "Saved",
    value: "saved",
    icons: { light: savedBlackIcon, dark: savedWhiteIcon }
  }
];

type FeedTopTabsProps = {
  activeFeedScope?: FeedScope;
  onFeedScopeChange?: (scope: FeedScope) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  sticky?: boolean;
};

export const FeedTopTabs = ({
  activeFeedScope = "for-you",
  onFeedScopeChange,
  searchValue = "",
  onSearchChange,
  sticky = true
}: FeedTopTabsProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isShortsRoute = location.pathname === "/shorts";
  const useDarkIcons = theme === "dark" || theme === "amoled";

  const handleFeedTab = (scope: FeedScope) => {
    if (location.pathname === "/feed" && onFeedScopeChange) {
      onFeedScopeChange(scope);
      return;
    }

    const query = scope === "for-you" ? "" : `?tab=${scope}`;
    navigate(`/feed${query}`);
  };

  return (
    <div className={`feed-tabs${sticky ? " feed-tabs--pinned" : " feed-tabs--static"}`} role="tablist">
      <div className="feed-tabs__list">
        {FEED_TABS.map((tab) => {
          const isActive = !isShortsRoute && activeFeedScope === tab.value;
          const iconSrc = isActive || useDarkIcons ? tab.icons.dark : tab.icons.light;

          return (
            <button
              aria-label={tab.label}
              aria-selected={isActive}
              className={`feed-tab${isActive ? " feed-tab--active" : ""}`}
              key={tab.value}
              onClick={() => handleFeedTab(tab.value)}
              role="tab"
              type="button"
            >
              <img alt="" aria-hidden="true" className="feed-tab__icon" src={iconSrc} />
              <span className="feed-tab__label">{tab.label}</span>
            </button>
          );
        })}
      </div>
      <form
        className="feed-tabs__search"
        onSubmit={(event) => event.preventDefault()}
        role="search"
      >
        <input
          aria-label="Search feed"
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder="Search"
          type="search"
          value={searchValue}
        />
        <button aria-label="Search feed" type="submit">
          <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
            <circle cx="11" cy="11" r="6.8" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20L16.2 16.2" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </button>
      </form>
    </div>
  );
};
