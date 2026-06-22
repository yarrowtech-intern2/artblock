import { BaselineLandingSections } from "../components/home/BaselineLandingSections";
import { LumoraHeroSection } from "../components/home/LumoraHeroSection";
import { PinnedStorySections } from "../components/home/PinnedStorySections";

export const NewHomePage = () => {
  const railItems = [
    "Are you an Artist",
    "you are in right place",
    "Love Arts?",
    "you are in right place"
  ];

  return (
    <div className="landing-page landing-page--new-home">
      <LumoraHeroSection />
      <section className="new-home-context-rail" aria-label="Context rail">
        <div className="new-home-context-rail__viewport">
          <div className="new-home-context-rail__track">
            {[...railItems, ...railItems].map((item, index) => (
              <span className="new-home-context-rail__item" key={`context-rail-${index}`}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>
      <PinnedStorySections />
      <BaselineLandingSections />
    </div>
  );
};
