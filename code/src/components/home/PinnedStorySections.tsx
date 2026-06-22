import { useEffect, useRef } from "react";

type StoryGlyph = {
  title: string;
  portrait: string;
};

type StoryPanel = {
  id: string;
  theme: "blue" | "violet";
  title: [string, string];
  body: string;
  glyphs: StoryGlyph[];
  ghostLabel: string;
};

const storyPanels: StoryPanel[] = [
  {
    id: "blue",
    theme: "blue",
    title: ["Join as", "a follower"],
    body:
      "Follow artists you actually care about, discover new work early, and stay close to the process instead of watching from a distance. ArtBlock is built to make fandom feel direct, personal, and worth returning to.",
    ghostLabel: "FOLLOWER",
    glyphs: [
      {
        title: "See more than posts",
        portrait:
          "https://res.cloudinary.com/dc3qprub3/image/upload/v1782130775/card1_ea2vvo.png"
      },
      {
        title: "Support with meaning",
        portrait:
          "https://res.cloudinary.com/dc3qprub3/image/upload/v1782130775/card2_jycrhu.png"
      },
      {
        title: "Stay in the inner circle",
        portrait:
          "https://res.cloudinary.com/dc3qprub3/image/upload/v1782130775/card3_n9hlnv.png"
      }
    ]
  },
  {
    id: "violet",
    theme: "violet",
    title: ["Join as", "an artist"],
    body:
      "Build a home for your art, shape how people discover it, and turn casual attention into a loyal supporter base. ArtBlock gives artists a cleaner space to present work, earn support, and grow a real community.",
    ghostLabel: "ARTIST",
    glyphs: [
      {
        title: "Own your presentation",
        portrait:
          "https://res.cloudinary.com/dc3qprub3/image/upload/v1782130917/card4_d87vuw.png"
      },
      {
        title: "Earn beyond attention",
        portrait:
          "https://res.cloudinary.com/dc3qprub3/image/upload/v1782130775/card5_jfkjwo.png"
      },
      {
        title: "Grow your own circle",
        portrait:
          "https://res.cloudinary.com/dc3qprub3/image/upload/v1782130775/card6_qfbetn.png"
      }
    ]
  }
];

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

const mapRange = (value: number, start: number, end: number) => {
  if (end <= start) {
    return 0;
  }

  return clamp((value - start) / (end - start));
};

const easeInOutCubic = (value: number) =>
  value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;

export const PinnedStorySections = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return undefined;
    }

    let frame = 0;

    const updateProgress = () => {
      frame = 0;

      const rect = section.getBoundingClientRect();
      const travel = Math.max(rect.height - window.innerHeight, 1);
      const progress = clamp(-rect.top / travel);

      section.style.setProperty("--story-progress", progress.toFixed(4));
      section.style.setProperty(
        "--story-blue-pattern",
        easeInOutCubic(mapRange(progress, 0.14, 0.3)).toFixed(4)
      );
      section.style.setProperty(
        "--story-blue-content",
        easeInOutCubic(mapRange(progress, 0.28, 0.48)).toFixed(4)
      );
      section.style.setProperty(
        "--story-violet-slide",
        easeInOutCubic(mapRange(progress, 0.5, 0.72)).toFixed(4)
      );
      section.style.setProperty(
        "--story-violet-pattern",
        easeInOutCubic(mapRange(progress, 0.72, 0.86)).toFixed(4)
      );
      section.style.setProperty(
        "--story-violet-content",
        easeInOutCubic(mapRange(progress, 0.82, 1)).toFixed(4)
      );
    };

    const scheduleUpdate = () => {
      if (frame !== 0) {
        return;
      }

      frame = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);

      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <section className="new-home-story" id="about" ref={sectionRef}>
      <div className="new-home-story__sticky">
        {storyPanels.map((panel) => (
          <article
            className={`new-home-story__panel new-home-story__panel--${panel.theme}`}
            key={panel.id}
          >
            <div className="new-home-story__ambient" aria-hidden="true" />
            <div className="new-home-story__mesh" aria-hidden="true" />

            <div className="new-home-story__content-shell">
              <div className="new-home-story__content">
                <header className="new-home-story__header">
                  <h2 className="new-home-story__title">
                    <span>{panel.title[0]}</span>
                    <span>{panel.title[1]}</span>
                  </h2>
                  <p className="new-home-story__body">{panel.body}</p>
                </header>

                <div className="new-home-story__glyph-grid">
                  {panel.glyphs.map((glyph) => (
                    <article className="new-home-story__glyph-card" key={glyph.title}>
                      <img
                        alt={glyph.title}
                        className="new-home-story__glyph-portrait"
                        loading="lazy"
                        src={glyph.portrait}
                      />
                    </article>
                  ))}
                </div>
              </div>

              <div className="new-home-story__art" aria-hidden="true">
                <div className="new-home-story__pattern-cluster">
                  <AlponaPattern />
                </div>
              </div>

              <div className="new-home-story__ghost">{panel.ghostLabel}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const AlponaPattern = () => (
  <svg className="new-home-story__pattern-svg" fill="none" viewBox="0 0 960 960">
    <g className="new-home-story__pattern-stroke">
      <circle cx="480" cy="480" r="112" />
      <circle cx="480" cy="480" r="176" />
      <circle cx="480" cy="480" r="244" />
      <circle cx="480" cy="480" r="308" />
      <path d="M480 116c28 48 58 78 102 102-44 24-74 54-102 102-28-48-58-78-102-102 44-24 74-54 102-102Z" />
      <path d="M844 480c-48 28-78 58-102 102-24-44-54-74-102-102 48-28 78-58 102-102 24 44 54 74 102 102Z" />
      <path d="M480 844c-28-48-58-78-102-102 44-24 74-54 102-102 28 48 58 78 102 102-44 24-74 54-102 102Z" />
      <path d="M116 480c48-28 78-58 102-102 24 44 54 74 102 102-48 28-78 58-102 102-24-44-54-74-102-102Z" />
      <path d="M480 44v116" />
      <path d="M480 800v116" />
      <path d="M44 480h116" />
      <path d="M800 480h116" />
      <path d="M240 240c35 10 64 25 90 51-26 26-55 41-90 51-10-35-25-64-51-90 26-26 41-55 51-90Z" />
      <path d="M720 240c10 35 25 64 51 90-26 26-41 55-51 90-35-10-64-25-90-51 26-26 55-41 90-51Z" />
      <path d="M240 720c35-10 64-25 90-51 26 26 55 41 90 51-35 10-64 25-90 51-26-26-55-41-90-51Z" />
      <path d="M720 720c-35-10-64-25-90-51-26 26-55 41-90 51 35 10 64 25 90 51 26-26 55-41 90-51Z" />
      <path d="M292 166c22 38 48 62 84 82-36 20-62 46-84 84-20-38-46-64-84-84 38-20 64-44 84-82Z" />
      <path d="M668 166c20 38 46 62 84 82-38 20-64 46-84 84-22-38-48-64-84-84 36-20 62-44 84-82Z" />
      <path d="M292 794c22-38 48-62 84-82-36-20-62-46-84-84-20 38-46 64-84 84 38 20 64 44 84 82Z" />
      <path d="M668 794c20-38 46-62 84-82-38-20-64-46-84-84-22 38-48 64-84 84 36 20 62 44 84 82Z" />
      <path d="M480 204c44 64 92 104 160 138-68 34-116 74-160 138-44-64-92-104-160-138 68-34 116-74 160-138Z" />
      <path d="M756 480c-64 44-104 92-138 160-34-68-74-116-138-160 64-44 104-92 138-160 34 68 74 116 138 160Z" />
      <path d="M480 756c-44-64-92-104-160-138 68-34 116-74 160-138 44 64 92 104 160 138-68 34-116 74-160 138Z" />
      <path d="M204 480c64-44 104-92 138-160 34 68 74 116 138 160-64 44-104 92-138 160-34-68-74-116-138-160Z" />
    </g>
    <g className="new-home-story__pattern-fill">
      <circle cx="480" cy="480" r="18" />
      <circle cx="480" cy="132" r="10" />
      <circle cx="828" cy="480" r="10" />
      <circle cx="480" cy="828" r="10" />
      <circle cx="132" cy="480" r="10" />
      <circle cx="244" cy="244" r="9" />
      <circle cx="716" cy="244" r="9" />
      <circle cx="716" cy="716" r="9" />
      <circle cx="244" cy="716" r="9" />
      <circle cx="480" cy="256" r="9" />
      <circle cx="704" cy="480" r="9" />
      <circle cx="480" cy="704" r="9" />
      <circle cx="256" cy="480" r="9" />
      <circle cx="332" cy="332" r="7" />
      <circle cx="628" cy="332" r="7" />
      <circle cx="628" cy="628" r="7" />
      <circle cx="332" cy="628" r="7" />
    </g>
  </svg>
);
