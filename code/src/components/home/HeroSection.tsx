const heroVideoUrl =
  "https://res.cloudinary.com/dc3qprub3/video/upload/v1781788646/hills_hgb7pu.mov";

export const HeroSection = () => (
  <section className="new-home-hero" id="works">
    <video
      aria-hidden="true"
      autoPlay
      className="new-home-hero__video"
      loop
      muted
      playsInline
      preload="metadata"
      src={heroVideoUrl}
    />
  </section>
);
