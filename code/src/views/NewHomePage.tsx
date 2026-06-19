import { HeroSection } from "../components/home/HeroSection";
import { LumoraHeroSection } from "../components/home/LumoraHeroSection";

export const NewHomePage = () => {
  return (
    <div className="landing-page landing-page--new-home">
      <LumoraHeroSection />
      <HeroSection />
    </div>
  );
};
