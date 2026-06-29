import { useLocation, useNavigate } from "react-router-dom";
import type { FeedScope } from "../../lib/profile";

const FEED_TABS: { label: string; value: FeedScope }[] = [
  { label: "For You", value: "for-you" },
  { label: "Following", value: "following" },
  { label: "Subscribed", value: "subscribed" },
  { label: "Saved", value: "saved" }
];

type FeedTopTabsProps = {
  activeFeedScope?: FeedScope;
  onFeedScopeChange?: (scope: FeedScope) => void;
  sticky?: boolean;
};

export const FeedTopTabs = ({
  activeFeedScope = "for-you",
  onFeedScopeChange,
  sticky = true
}: FeedTopTabsProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isShortsRoute = location.pathname === "/shorts";

  const handleFeedTab = (scope: FeedScope) => {
    if (location.pathname === "/feed" && onFeedScopeChange) {
      onFeedScopeChange(scope);
      return;
    }

    const query = scope === "for-you" ? "" : `?tab=${scope}`;
    navigate(`/feed${query}`);
  };

  return (
    <div className={`feed-tabs${sticky ? "" : " feed-tabs--static"}`} role="tablist">
      {FEED_TABS.map((tab) => (
        <button
          aria-selected={!isShortsRoute && activeFeedScope === tab.value}
          className={`feed-tab${!isShortsRoute && activeFeedScope === tab.value ? " feed-tab--active" : ""}`}
          key={tab.value}
          onClick={() => handleFeedTab(tab.value)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
