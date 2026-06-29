import { Link } from "react-router-dom";
import { FeedTopTabs } from "../components/feed/FeedTopTabs";
import { useAuth } from "../providers/AuthProvider";

export const ShortsPage = () => {
  const { profile } = useAuth();

  return (
    <section className="shorts-page">
      <div className="shorts-shell">
        <div className="shorts-main">
          <FeedTopTabs />

          <div className="shorts-stage">
            <article className="shorts-phone">
              <div className="shorts-phone__glass" />
              <div className="shorts-phone__media" />

              <div className="shorts-phone__head">
                <span className="section-heading__eyebrow">Shorts</span>
                <strong>Infinite reel stream shell</strong>
              </div>

              <div className="shorts-phone__actions" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>

              <div className="shorts-phone__body">
                <h1>Short-form video is staged here.</h1>
                <p>
                  This route is ready for vertical reel cards, autoplay, gesture navigation, and
                  infinite scroll.
                </p>
              </div>

              <div className="shorts-phone__footer">
                <div>
                  <strong>{profile?.full_name ?? "Your channel"}</strong>
                  <span>Future reel captions, soundtrack, and CTA stack.</span>
                </div>
                <Link className="ghost-button" to="/feed?tab=for-you">
                  Back to feed
                </Link>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
};
