import { Suspense, lazy, useEffect, useRef } from "react";

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

const StoryPanelShaderBackground = lazy(() => import("./StoryPanelShaderBackground"));

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
            {panel.theme === "blue" || panel.theme === "violet" ? (
              <Suspense fallback={<div aria-hidden="true" className="new-home-story__shader-bg" />}>
                <StoryPanelShaderBackground variant={panel.theme} />
              </Suspense>
            ) : null}
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
      {/* Central lotus bloom */}
      <circle cx="480" cy="480" r="56" />
      <circle cx="480" cy="480" r="108" />
      <circle cx="480" cy="480" r="172" />
      <circle cx="480" cy="480" r="252" />
      <circle cx="480" cy="480" r="340" />
      <circle cx="480" cy="480" r="420" />

      {/* Petal arcs — 8-fold symmetry (like traditional alpona) */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 480 480)`}>
          {/* Large outer petal */}
          <path d="M480 60 C520 200, 580 300, 480 370 C380 300, 440 200, 480 60Z" />
          {/* Inner petal (smaller, nested) */}
          <path d="M480 170 C508 260, 540 310, 480 360 C420 310, 452 260, 480 170Z" />
          {/* Curving vine tendril */}
          <path d="M480 108 Q540 220, 510 340" />
          <path d="M480 108 Q420 220, 450 340" />
          {/* Small teardrop near rim */}
          <path d="M480 430 Q495 445, 480 460 Q465 445, 480 430Z" />
        </g>
      ))}

      {/* Paisley swirls at diagonals */}
      {[45, 135, 225, 315].map((angle) => (
        <g key={`paisley-${angle}`} transform={`rotate(${angle} 480 480)`}>
          <path d="M480 90 C530 130, 540 190, 500 220 C460 250, 420 220, 430 180 C440 150, 460 130, 480 90Z" />
          <path d="M480 130 C510 155, 515 185, 498 200" />
        </g>
      ))}

      {/* Connecting scallop arcs between cardinal petals */}
      <path d="M310 170 Q370 210, 310 260" />
      <path d="M650 170 Q590 210, 650 260" />
      <path d="M310 700 Q370 750, 310 800" />
      <path d="M650 700 Q590 750, 650 800" />
      <path d="M170 310 Q210 370, 170 430" />
      <path d="M170 530 Q210 590, 170 650" />
      <path d="M790 310 Q750 370, 790 430" />
      <path d="M790 530 Q750 590, 790 650" />

      {/* Outer ring scallops */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i * 15 * Math.PI) / 180;
        const r1 = 410;
        const r2 = 440;
        const cx1 = 480 + Math.cos(a - 0.12) * r1;
        const cy1 = 480 + Math.sin(a - 0.12) * r1;
        const cx2 = 480 + Math.cos(a + 0.12) * r1;
        const cy2 = 480 + Math.sin(a + 0.12) * r1;
        const mx = 480 + Math.cos(a) * r2;
        const my = 480 + Math.sin(a) * r2;
        return (
          <path
            key={`scallop-${i}`}
            d={`M${cx1.toFixed(1)} ${cy1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${cx2.toFixed(1)} ${cy2.toFixed(1)}`}
          />
        );
      })}
    </g>

    <g className="new-home-story__pattern-fill">
      {/* Center jewel */}
      <circle cx="480" cy="480" r="20" />
      {/* Cardinal dots */}
      {[0, 90, 180, 270].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return [108, 252, 380].map((r) => (
          <circle
            key={`dot-${angle}-${r}`}
            cx={480 + Math.cos(rad) * r}
            cy={480 + Math.sin(rad) * r}
            r={r > 300 ? 8 : r > 200 ? 10 : 7}
          />
        ));
      })}
      {/* Diagonal dots */}
      {[45, 135, 225, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return [140, 280].map((r) => (
          <circle
            key={`diag-${angle}-${r}`}
            cx={480 + Math.cos(rad) * r}
            cy={480 + Math.sin(rad) * r}
            r={r > 200 ? 9 : 7}
          />
        ));
      })}
      {/* Tiny dots on the outermost ring */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i * 22.5 * Math.PI) / 180;
        return (
          <circle
            key={`rim-${i}`}
            cx={480 + Math.cos(a) * 420}
            cy={480 + Math.sin(a) * 420}
            r={5}
          />
        );
      })}
    </g>
  </svg>
);
