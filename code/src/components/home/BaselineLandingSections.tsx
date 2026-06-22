import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import heroVideo1 from "../../public/videos/hero-1.mp4";
import heroVideo2 from "../../public/videos/hero-2.mp4";
import heroVideo3 from "../../public/videos/hero-3.mp4";
import heroVideo4 from "../../public/videos/hero-4.mp4";
import heroVideo5 from "../../public/videos/hero-5.mp4";

const trustSlides = [
  {
    words: ["Artist", "Fan-", "Powered", "Platform"],
    video: heroVideo5,
    name: "Ava Sen",
    role: "Featured Artist",
    label: "Featured artist visual"
  },
  {
    words: ["Stories", "Posts", "Polls", "Together"],
    video: heroVideo4,
    name: "Luca Moretti",
    role: "Fan Curator",
    label: "Fan curator visual"
  },
  {
    words: ["Creative", "Careers", "Grow", "Here"],
    video: heroVideo1,
    name: "Noah Hart",
    role: "Community Host",
    label: "Community host visual"
  }
];

const programs = [
  {
    id: "junior",
    index: "01",
    name: "Artist Profiles",
    description: "Profiles, galleries, and bios built for growing artists."
  },
  {
    id: "performance",
    index: "02",
    name: "Fan Support",
    description: "Tips and donations for creators and supporters."
  },
  {
    id: "adult",
    index: "03",
    name: "Community Spaces",
    description: "Community spaces to deepen conversation and belonging."
  },
  {
    id: "private",
    index: "04",
    name: "Creator Earnings",
    description: "Monetization features tailored to your growth and audience."
  }
];

const facilities = [
  {
    id: "shop",
    tone: "clay" as const,
    name: "Studio Feed",
    description: "A premium creator hub shaped for direct, repeat supporter rituals.",
    video: heroVideo2,
    label: "Studio feed art visual"
  },
  {
    id: "club",
    tone: "blue" as const,
    name: "Support Circle",
    description: "A polished fan space built for discovery and daily returns.",
    video: heroVideo3,
    label: "Support circle art visual"
  }
];

const stats = [
  { value: "24", label: "Active creators" },
  { value: "12", label: "Live communities" },
  { value: "9K+", label: "Supporter tips" },
  { value: "15", label: "Posts shared each week" }
];

const testimonials = [
  {
    quote:
      "I found a rhythm to my posting in one season. The product is focused and it actually converts.",
    name: "Priya Anand",
    role: "Featured Artist"
  },
  {
    quote:
      "Best place for discovery and a team that treats every artist like a real headliner.",
    name: "Lukas Brenner",
    role: "Active Supporter"
  },
  {
    quote:
      "My art went from quiet profile to daily support. Worth every minute.",
    name: "Dana Okafor",
    role: "Independent Visual Artist"
  }
];

const footerColumns = [
  {
    title: "Creators",
    links: [
      { label: "Artist Profiles", href: "#junior" },
      { label: "Creator Earnings", href: "#performance" },
      { label: "Post Formats", href: "#adult" },
      { label: "Studio Tools", href: "#private" }
    ]
  },
  {
    title: "Fans",
    links: [
      { label: "Tipping", href: "#membership" },
      { label: "Follows", href: "#facilities" },
      { label: "Polls", href: "#testimonials" },
      { label: "Fan Clubs", href: "#shop" }
    ]
  },
  {
    title: "Platform",
    links: [
      { label: "About", href: "#about" },
      { label: "Safety", href: "#programs" },
      { label: "Careers", href: "#careers" },
      { label: "Contact", href: "#contact" }
    ]
  }
];

const socials = [
  { label: "Instagram", href: "#instagram" },
  { label: "X", href: "#x" },
  { label: "YouTube", href: "#youtube" },
  { label: "LinkedIn", href: "#linkedin" }
];

const legalLinks = [
  { label: "Privacy", href: "#privacy" },
  { label: "Terms", href: "#terms" }
];

const ArrowIcon = ({ reverse = false }: { reverse?: boolean }) => (
  <svg
    aria-hidden="true"
    className={`baseline-arrow-icon${reverse ? " is-reversed" : ""}`}
    fill="none"
    viewBox="0 0 24 24"
  >
    <path
      d="M5 12h14M13 6l6 6-6 6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

const TennisBallIcon = () => (
  <svg aria-hidden="true" className="baseline-brand-icon" fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path d="M4.8 5.6A9 9 0 0 0 4.8 18.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    <path d="M19.2 5.6a9 9 0 0 1 0 12.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </svg>
);

const Eyebrow = ({ children, tone = "dark" }: { children: string; tone?: "dark" | "light" }) => (
  <div className={`baseline-eyebrow baseline-eyebrow--${tone}`}>
    <span className="baseline-eyebrow__dot" />
    <span>{children}</span>
  </div>
);

const revealDelayStyle = (delay: number) =>
  ({ ["--baseline-delay" as string]: `${delay}ms` }) as CSSProperties;

const StackedLines = ({
  id,
  as: Tag = "h2",
  className,
  lines,
  baseDelay = 0,
  delayStep = 120
}: {
  id?: string;
  as?: "h2" | "p";
  className?: string;
  lines: string[];
  baseDelay?: number;
  delayStep?: number;
}) => (
  <Tag className={`baseline-stacked-lines${className ? ` ${className}` : ""}`} data-reveal id={id}>
    {lines.map((line, index) => (
      <span className="baseline-stacked-lines__clip" key={`${line}-${index}`}>
        <span className="baseline-stacked-lines__inner" style={revealDelayStyle(baseDelay + index * delayStep)}>
          {line}
        </span>
      </span>
    ))}
  </Tag>
);

const WordFadeText = ({
  className,
  text
}: {
  className?: string;
  text: string;
}) => (
  <p className={`baseline-word-fade${className ? ` ${className}` : ""}`} data-reveal>
    {text.split(" ").map((word, index, words) => (
      <span className="baseline-word-fade__clip" key={`${word}-${index}`}>
        <span className="baseline-word-fade__inner" style={revealDelayStyle(250 + index * 28)}>
          {word}
          {index < words.length - 1 ? "\u00A0" : ""}
        </span>
      </span>
    ))}
  </p>
);

const CarouselDots = ({
  count,
  activeIndex,
  onSelect,
  tone
}: {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  tone: "dark" | "light";
}) => (
  <div className={`baseline-carousel-dots baseline-carousel-dots--${tone}`} role="tablist" aria-label="Carousel pagination">
    {Array.from({ length: count }).map((_, index) => (
      <button
        aria-current={index === activeIndex}
        aria-label={`Go to slide ${index + 1}`}
        className={`baseline-carousel-dots__button${index === activeIndex ? " is-active" : ""}`}
        key={`dot-${index}`}
        onClick={() => onSelect(index)}
        type="button"
      >
        <span />
      </button>
    ))}
  </div>
);

const ArrowButton = ({
  label,
  onClick,
  reverse = false,
  tone
}: {
  label: string;
  onClick: () => void;
  reverse?: boolean;
  tone: "outline" | "solid";
}) => (
  <button
    aria-label={label}
    className={`baseline-arrow-button baseline-arrow-button--${tone}`}
    onClick={onClick}
    type="button"
  >
    <ArrowIcon reverse={reverse} />
  </button>
);

const PillButton = ({
  children,
  onClick,
  tone = "light"
}: {
  children: string;
  onClick?: () => void;
  tone?: "light" | "solid" | "outline";
}) => (
  <button
    className={`baseline-pill-button baseline-pill-button--${tone}`}
    onClick={onClick}
    type="button"
  >
    <span>{children}</span>
    <ArrowIcon />
  </button>
);

export const BaselineLandingSections = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [trustIndex, setTrustIndex] = useState(0);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const element = entry.target as HTMLElement;
          element.classList.add("is-visible");
          observer.unobserve(element);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTrustIndex((current) => (current + 1) % trustSlides.length);
    }, 4800);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const openContactModal = () => {
    window.dispatchEvent(new Event("lumora:open-contact"));
  };

  const currentTrust = trustSlides[trustIndex];
  const trustRows = [currentTrust.words.slice(0, 2), currentTrust.words.slice(2, 4)];

  return (
    <div className="baseline-page" ref={rootRef}>
      <section className="baseline-trust baseline-anchor-section" id="creator-proof">
        <div className="baseline-trust__top">
          <div className="baseline-trust__percent baseline-reveal baseline-reveal--scale" data-reveal>
            <strong>100%</strong>
            <span>Discovery built around your art</span>
          </div>

          <article className="baseline-trust__badge baseline-reveal" data-reveal style={revealDelayStyle(120)}>
            <div className="baseline-trust__index">#01</div>
            <div>
              <h3>Trusted by modern creators</h3>
              <p>
                From emerging artists to loyal supporters, members stay here because
                every feature turns attention into lasting support.
              </p>
            </div>
          </article>
        </div>

        <div className="baseline-trust__stage">
          <h2 className="baseline-trust__headline" id="trust-title" key={`headline-${trustIndex}`}>
            {trustRows.map((row, rowIndex) => (
              <span className="baseline-trust__headline-row" key={`row-${rowIndex}`}>
                {row.map((word, wordIndex) => {
                  const absoluteIndex = rowIndex * 2 + wordIndex;
                  return (
                    <span
                      className={`baseline-trust__word${absoluteIndex === 2 ? " is-ink" : ""}`}
                      key={`${word}-${trustIndex}`}
                      style={revealDelayStyle(absoluteIndex * 90)}
                    >
                      <span className="baseline-trust__word-inner">{word}</span>
                    </span>
                  );
                })}
              </span>
            ))}
          </h2>

          <figure className="baseline-trust__coach baseline-reveal baseline-reveal--lift" data-reveal>
            <video
              aria-label={currentTrust.label}
              autoPlay
              className="baseline-trust__coach-image"
              key={`coach-${trustIndex}`}
              loop
              muted
              playsInline
              preload="metadata"
              src={currentTrust.video}
            />
            <figcaption>
              <strong>{currentTrust.name}</strong>
              <span>{currentTrust.role}</span>
            </figcaption>
          </figure>
        </div>

        <div className="baseline-trust__controls baseline-reveal" data-reveal style={revealDelayStyle(180)}>
          <ArrowButton
            label="Previous creator"
            onClick={() => setTrustIndex((current) => (current - 1 + trustSlides.length) % trustSlides.length)}
            reverse
            tone="outline"
          />
          <CarouselDots
            activeIndex={trustIndex}
            count={trustSlides.length}
            onSelect={setTrustIndex}
            tone="dark"
          />
          <ArrowButton
            label="Next creator"
            onClick={() => setTrustIndex((current) => (current + 1) % trustSlides.length)}
            tone="solid"
          />
        </div>
      </section>

      <section className="baseline-programs baseline-anchor-section" id="programs">
        <Eyebrow>Creator journeys</Eyebrow>
        <StackedLines className="baseline-section-title" id="programs-title" lines={["Made for", "every creator"]} />

        <ul className="baseline-programs__list">
          {programs.map((program, index) => (
            <li className="baseline-programs__item" id={program.id} key={program.id}>
              <a
                className="baseline-programs__link baseline-reveal"
                data-reveal
                href={`#${program.id}`}
                style={revealDelayStyle(index * 90)}
              >
                <span className="baseline-programs__index">{program.index}</span>
                <span className="baseline-programs__copy">
                  <strong>{program.name}</strong>
                  <span>{program.description}</span>
                </span>
                <span className="baseline-programs__arrow-shell">
                  <ArrowIcon />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="baseline-facilities baseline-anchor-section" id="facilities">
        <div className="baseline-facilities__grid">
          <div className="baseline-facilities__intro">
            <video
              aria-label="Creator spaces visual"
              autoPlay
              className="baseline-facilities__icon baseline-reveal baseline-reveal--scale"
              data-reveal
              loop
              muted
              playsInline
              preload="metadata"
              src={heroVideo3}
            />

            <StackedLines
              className="baseline-section-title"
              id="facilities-title"
              lines={["See Our", "Creator-First", "Spaces"]}
            />

            <WordFadeText
              className="baseline-facilities__body"
              text="Explore a platform for featured posts, member communities, or direct support and connect in the same spaces artists grow every day."
            />
          </div>

          <div className="baseline-facilities__cards">
            {facilities.map((facility, index) => (
              <figure
                className={`baseline-facilities__card baseline-facilities__card--${facility.tone} baseline-reveal baseline-reveal--lift${
                  index === 1 ? " is-offset" : ""
                }`}
                data-reveal
                id={facility.id}
                key={facility.name}
                style={revealDelayStyle(index * 140)}
              >
                <video
                  aria-label={facility.label}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  src={facility.video}
                />
                <figcaption>
                  <strong>{facility.name}</strong>
                  <span>{facility.description}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="baseline-stats baseline-anchor-section" id="membership">
        <Eyebrow tone="light">By the numbers</Eyebrow>
        <StackedLines className="baseline-section-title baseline-section-title--light" id="stats-title" lines={["A platform that", "builds trust"]} />

        <dl className="baseline-stats__grid">
          {stats.map((item, index) => (
            <div className="baseline-stats__cell baseline-reveal" data-reveal key={item.label} style={revealDelayStyle(index * 110)}>
              <dt className="baseline-sr-only">{item.label}</dt>
              <dd>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="baseline-testimonials baseline-anchor-section" id="testimonials">
        <Eyebrow>What members say</Eyebrow>
        <StackedLines
          className="baseline-section-title"
          id="testimonials-title"
          lines={["Trusted by", "the creator circle"]}
        />

        <ul className="baseline-testimonials__grid">
          {testimonials.map((testimonial, index) => (
            <li
              className="baseline-testimonials__card baseline-reveal baseline-reveal--lift"
              data-reveal
              key={testimonial.name}
              style={revealDelayStyle(index * 120)}
            >
              <figure>
                <span className="baseline-testimonials__mark">&quot;</span>
                <blockquote>{testimonial.quote}</blockquote>
                <figcaption>
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.role}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      <footer className="baseline-footer baseline-anchor-section" id="contact">
        <span className="baseline-hidden-anchor" id="careers" />
        <span className="baseline-hidden-anchor" id="instagram" />
        <span className="baseline-hidden-anchor" id="x" />
        <span className="baseline-hidden-anchor" id="youtube" />
        <span className="baseline-hidden-anchor" id="linkedin" />
        <span className="baseline-hidden-anchor" id="privacy" />
        <span className="baseline-hidden-anchor" id="terms" />

        <div className="baseline-footer__cta">
          <div>
            <Eyebrow tone="light">Get started</Eyebrow>
            <StackedLines as="p" className="baseline-footer__title" lines={["Ready to", "launch?"]} />
          </div>

          <div className="baseline-reveal" data-reveal style={revealDelayStyle(150)}>
            <PillButton onClick={openContactModal}>Start Your Profile</PillButton>
          </div>
        </div>

        <div className="baseline-footer__grid">
          <div className="baseline-footer__brand">
            <div className="baseline-footer__brand-mark">
              <TennisBallIcon />
              <span>ArtBlock</span>
            </div>
            <p>
              A creator platform where standout art meets loyal fans, support,
              and community.
            </p>
            <address>
              <a href="mailto:support@artblock.com">support@artblock.com</a>
              <a href="tel:+12125550148">+1 (212) 555-0148</a>
              <span>For artists, online worldwide</span>
            </address>
          </div>

          {footerColumns.map((column) => (
            <nav className="baseline-footer__nav" key={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="baseline-footer__bottom">
          <span>© 2026 ArtBlock Creator Platform. All rights reserved.</span>

          <nav className="baseline-footer__bottom-nav" aria-label="Social links">
            {socials.map((item) => (
              <a href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </nav>

          <nav className="baseline-footer__bottom-nav" aria-label="Legal links">
            {legalLinks.map((item) => (
              <a href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
};
