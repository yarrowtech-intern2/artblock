import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CreatorSpotlightSection } from "../components/home/CreatorSpotlightSection";
import { ImmersionSection } from "../components/home/ImmersionSection";
import { MomentumSection } from "../components/home/MomentumSection";
import { SignalConsole } from "../components/home/SignalConsole";
import { getSupabaseClient } from "../lib/supabase";
import type { Database } from "../lib/supabase.types";
import heroVideo1 from "../public/videos/hero-1.mp4";
import heroVideo2 from "../public/videos/hero-2.mp4";
import heroVideo3 from "../public/videos/hero-3.mp4";
import heroVideo4 from "../public/videos/hero-4.mp4";
import heroVideo5 from "../public/videos/hero-5.mp4";

const heroVideos = [heroVideo1, heroVideo2, heroVideo3, heroVideo4, heroVideo5];

const portalRadius = 88;
const transitionMs = 1100;
const portalPointCount = 18;

function buildPortalBlobPath(
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
  time: number,
  radius: number
) {
  const points: Array<{ x: number; y: number }> = [];
  const speed = Math.min(Math.hypot(velocityX, velocityY), 18);
  const motionAngle = speed > 0.01 ? Math.atan2(velocityY, velocityX) : 0;
  const stretch = Math.min(speed * 0.38, radius * 0.22);
  const wobbleStrength = Math.min(speed * 0.04, radius * 0.045);
  const safeRadius = Math.max(radius, 0);

  for (let index = 0; index < portalPointCount; index += 1) {
    const theta = (index / portalPointCount) * Math.PI * 2;
    const alignment = Math.cos(theta - motionAngle);
    const leading = Math.max(alignment, 0) ** 2 * stretch * 0.72;
    const trailing = Math.max(-alignment, 0) ** 2 * stretch * 0.16;
    const sideCompression = Math.abs(Math.sin(theta - motionAngle)) * stretch * 0.14;
    const wobble =
      Math.sin(theta * 3 + time * 0.008) * wobbleStrength +
      Math.sin(theta * 5 - time * 0.011) * wobbleStrength * 0.3;
    const dynamicRadius = Math.max(
      safeRadius * 0.9,
      safeRadius + leading - trailing - sideCompression + wobble
    );
    points.push({
      x: x + Math.cos(theta) * dynamicRadius,
      y: y + Math.sin(theta) * dynamicRadius
    });
  }

  if (points.length === 0) {
    return `circle(${safeRadius}px at ${x}px ${y}px)`;
  }

  const tension = 0.92;
  const format = (value: number) => Number(value.toFixed(2));
  let path = `M ${format(points[0].x)} ${format(points[0].y)}`;

  for (let index = 0; index < points.length; index += 1) {
    const p0 = points[(index - 1 + points.length) % points.length];
    const p1 = points[index];
    const p2 = points[(index + 1) % points.length];
    const p3 = points[(index + 2) % points.length];

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;

    path += ` C ${format(cp1x)} ${format(cp1y)}, ${format(cp2x)} ${format(cp2y)}, ${format(
      p2.x
    )} ${format(p2.y)}`;
  }

  return `path("${path} Z")`;
}

const proofItems = [
  "Live creator pages",
  "Recurring memberships",
  "Direct audience access",
  "Member-only publishing"
];

const heroSignals = [
  {
    label: "Creators live",
    value: "12.4k",
    meta: "Pages launched across the network"
  },
  {
    label: "Repeat support",
    value: "74%",
    meta: "Members renewing month over month"
  },
  {
    label: "Time to publish",
    value: "18 min",
    meta: "From signup to public creator page"
  }
];

type FeaturedCreator = {
  slug: string;
  displayName: string;
  headline: string;
  category: string;
  monthlySupporters: number;
  startingPrice: number;
  initials: string;
};

const fallbackCreators: FeaturedCreator[] = [
  {
    slug: "naia-sol",
    displayName: "Naia Sol",
    headline: "Visual journals, behind-the-scenes process notes, and monthly studio drops.",
    category: "Illustration",
    monthlySupporters: 1800,
    startingPrice: 9,
    initials: "NS"
  },
  {
    slug: "kira-vale",
    displayName: "Kira Vale",
    headline: "Short films, annotated scripts, and member-only production diaries.",
    category: "Film",
    monthlySupporters: 940,
    startingPrice: 12,
    initials: "KV"
  },
  {
    slug: "iris-noor",
    displayName: "Iris Noor",
    headline: "Editorial photography releases, archive scans, and private critique sessions.",
    category: "Photography",
    monthlySupporters: 620,
    startingPrice: 15,
    initials: "IN"
  },
  {
    slug: "rafi-nova",
    displayName: "Rafi Nova",
    headline: "Live demos, early mixes, and a closer relationship with the audience funding the work.",
    category: "Music",
    monthlySupporters: 430,
    startingPrice: 8,
    initials: "RN"
  }
];

const showcaseCategories = ["Illustration", "Film", "Photography", "Music"];
const startingPriceScale = [8, 10, 12, 15];

const toFeaturedCreator = (
  row: Database["public"]["Views"]["public_member_profiles"]["Row"],
  index: number
): FeaturedCreator | null => {
  if (!row.creator_slug || !row.full_name) {
    return null;
  }

  const nameParts = row.full_name
    .split(" ")
    .map((value) => value.trim())
    .filter(Boolean);
  const initials = nameParts
    .slice(0, 2)
    .map((value) => value[0]?.toUpperCase() ?? "")
    .join("") || "AB";

  return {
    slug: row.creator_slug,
    displayName: row.full_name,
    headline: row.headline ?? row.bio ?? "Independent creator building directly with supporters on ArtBlock.",
    category: showcaseCategories[index % showcaseCategories.length],
    monthlySupporters: Math.max(
      Number(row.subscriber_count ?? 0),
      Number(row.follower_count ?? 0),
      120 + index * 85
    ),
    startingPrice: startingPriceScale[index % startingPriceScale.length],
    initials
  };
};

const loadFeaturedCreators = async () => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return fallbackCreators;
  }

  const { data, error } = await supabase
    .from("public_member_profiles")
    .select("*")
    .eq("role", "creator")
    .order("is_verified_artist", { ascending: false })
    .order("subscriber_count", { ascending: false })
    .order("follower_count", { ascending: false })
    .limit(8);

  if (error) {
    return fallbackCreators;
  }

  const liveCreators = ((data ?? []) as Database["public"]["Views"]["public_member_profiles"]["Row"][])
    .map((row, index) => toFeaturedCreator(row, index))
    .filter((row): row is FeaturedCreator => row !== null)
    .slice(0, 4);

  if (liveCreators.length === 0) {
    return fallbackCreators;
  }

  const seen = new Set(liveCreators.map((creator) => creator.slug));
  const merged = [...liveCreators];

  for (const fallback of fallbackCreators) {
    if (merged.length >= 4) {
      break;
    }

    if (!seen.has(fallback.slug)) {
      merged.push(fallback);
      seen.add(fallback.slug);
    }
  }

  return merged;
};

export const HomePage = () => {
  const [creators, setCreators] = useState<FeaturedCreator[]>(fallbackCreators);
  const [isLoading, setIsLoading] = useState(true);
  const heroRef = useRef<HTMLElement>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const portalBubbleRefs = useRef<Array<HTMLDivElement | null>>([]);
  const currentSlot = useRef<"a" | "b">("a");
  const videoIndexRef = useRef(0);
  const shuffledRef = useRef<string[]>([]);
  const cursorRef = useRef({ x: 0, y: 0, clientX: 0, clientY: 0 });
  const transitioningRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const videoA = videoARef.current;
    const videoB = videoBRef.current;

    if (!hero || !videoA || !videoB) {
      return undefined;
    }

    const finePointer = window.matchMedia("(pointer: fine)").matches;

    const rect = hero.getBoundingClientRect();
    const startX = rect.width / 2;
    const startY = rect.height / 2;
    cursorRef.current = {
      x: startX,
      y: startY,
      clientX: rect.left + startX,
      clientY: rect.top + startY
    };

    const shuffled = [...heroVideos].sort(() => Math.random() - 0.5);
    shuffledRef.current = shuffled;

    videoA.src = shuffled[0];
    videoA.load();
    void videoA.play().catch(() => undefined);
    videoA.style.zIndex = "1";
    videoA.style.clipPath = "none";

    videoB.src = shuffled[1 % shuffled.length];
    videoB.load();
    void videoB.play().catch(() => undefined);
    videoB.style.zIndex = "2";
    videoB.style.clipPath = "circle(0px at 50% 50%)";

    currentSlot.current = "a";
    videoIndexRef.current = 0;

    const getCurrentVideo = () => (currentSlot.current === "a" ? videoA : videoB);
    const getNextVideo = () => (currentSlot.current === "a" ? videoB : videoA);
    const bubbleStates = [
      { x: startX, y: startY, vx: 0, vy: 0 },
      { x: startX, y: startY, vx: 0, vy: 0 },
      { x: startX, y: startY, vx: 0, vy: 0 },
      { x: startX, y: startY, vx: 0, vy: 0 }
    ];
    const portalState = {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      visible: false,
      previousFrame: performance.now()
    };

    const renderPortal = (x: number, y: number, vx: number, vy: number, radius: number) => {
      if (transitioningRef.current || !finePointer) {
        return;
      }

      const nextVideo = getNextVideo();
      nextVideo.style.transition = "none";
      nextVideo.style.clipPath = buildPortalBlobPath(x, y, vx, vy, performance.now(), radius);
    };

    const setBubbleVisibility = (isVisible: boolean) => {
      portalBubbleRefs.current.forEach((bubble) => {
        if (bubble) {
          bubble.style.opacity = isVisible ? "1" : "0";
        }
      });
    };

    const animatePortal = (now: number) => {
      const dt = Math.min((now - portalState.previousFrame) / 16.6667, 1.6);
      portalState.previousFrame = now;

      if (portalState.visible && !transitioningRef.current && finePointer) {
        const dx = cursorRef.current.x - portalState.x;
        const dy = cursorRef.current.y - portalState.y;
        const spring = 0.15;
        const damping = 0.78;
        const heroRect = hero.getBoundingClientRect();

        portalState.vx = (portalState.vx + dx * spring * dt) * damping;
        portalState.vy = (portalState.vy + dy * spring * dt) * damping;
        portalState.x += portalState.vx * dt;
        portalState.y += portalState.vy * dt;

        renderPortal(portalState.x, portalState.y, portalState.vx, portalState.vy, portalRadius);

        bubbleStates.forEach((bubble, index) => {
          const source =
            index === 0
              ? {
                  x: portalState.x - portalState.vx * 1.45,
                  y: portalState.y - portalState.vy * 1.45,
                  vx: portalState.vx,
                  vy: portalState.vy
                }
              : bubbleStates[index - 1];
          const followSpring = 0.12 - index * 0.015;
          const followDamping = 0.75 - index * 0.03;
          const bubbleDx = source.x - bubble.x;
          const bubbleDy = source.y - bubble.y;

          bubble.vx = (bubble.vx + bubbleDx * followSpring * dt) * followDamping;
          bubble.vy = (bubble.vy + bubbleDy * followSpring * dt) * followDamping;
          bubble.x += bubble.vx * dt;
          bubble.y += bubble.vy * dt;

          const bubbleEl = portalBubbleRefs.current[index];
          if (bubbleEl) {
            const speed = Math.min(Math.hypot(source.vx ?? bubble.vx, source.vy ?? bubble.vy), 18);
            const scale = Math.max(0.82 - index * 0.08 + speed / 60, 0.58);
            bubbleEl.style.transform =
              `translate(${heroRect.left + bubble.x}px, ${heroRect.top + bubble.y}px) ` +
              `translate(-50%, -50%) scale(${scale})`;
          }
        });
      }

      animationFrameRef.current = window.requestAnimationFrame(animatePortal);
    };

    const showPortal = (x: number, y: number) => {
      if (transitioningRef.current || !finePointer) {
        return;
      }

      portalState.visible = true;
      cursorRef.current.x = x;
      cursorRef.current.y = y;
      setBubbleVisibility(true);
      renderPortal(portalState.x, portalState.y, portalState.vx, portalState.vy, portalRadius);
    };

    const hidePortal = () => {
      if (transitioningRef.current || !finePointer) {
        return;
      }

      portalState.visible = false;
      setBubbleVisibility(false);
      const nextVideo = getNextVideo();
      nextVideo.style.transition = "clip-path 0.4s ease";
      nextVideo.style.clipPath = buildPortalBlobPath(
        portalState.x,
        portalState.y,
        0,
        0,
        performance.now(),
        0
      );
    };

    const doTransition = () => {
      if (transitioningRef.current) {
        return;
      }

      transitioningRef.current = true;
      const isCurrentA = currentSlot.current === "a";
      const currentVideo = getCurrentVideo();
      const nextVideo = getNextVideo();
      const { x, y } = cursorRef.current;
      const expandRadius = Math.max(hero.clientWidth, hero.clientHeight) * 2.4;

      nextVideo.style.transition = `clip-path ${transitionMs}ms cubic-bezier(0.77, 0, 0.175, 1)`;
      nextVideo.style.clipPath = buildPortalBlobPath(
        portalState.x,
        portalState.y,
        0,
        0,
        performance.now(),
        expandRadius
      );
      portalState.visible = false;
      setBubbleVisibility(false);

      timeoutRef.current = window.setTimeout(() => {
        nextVideo.style.zIndex = "1";
        nextVideo.style.transition = "none";
        nextVideo.style.clipPath = "none";

        const nextVideoIndex = (videoIndexRef.current + 2) % shuffledRef.current.length;
        currentVideo.style.zIndex = "2";
        currentVideo.style.clipPath = buildPortalBlobPath(x, y, 0, 0, performance.now(), 0);
        currentVideo.src = shuffledRef.current[nextVideoIndex];
        currentVideo.load();
        void currentVideo.play().catch(() => undefined);

        videoIndexRef.current = (videoIndexRef.current + 1) % shuffledRef.current.length;
        currentSlot.current = isCurrentA ? "b" : "a";
        transitioningRef.current = false;
        portalState.x = cursorRef.current.x;
        portalState.y = cursorRef.current.y;
        portalState.vx = 0;
        portalState.vy = 0;
        bubbleStates.forEach((bubble) => {
          bubble.x = cursorRef.current.x;
          bubble.y = cursorRef.current.y;
          bubble.vx = 0;
          bubble.vy = 0;
        });

        showPortal(cursorRef.current.x, cursorRef.current.y);
      }, transitionMs + 60);
    };

    const onMove = (event: MouseEvent) => {
      const currentRect = hero.getBoundingClientRect();
      const x = event.clientX - currentRect.left;
      const y = event.clientY - currentRect.top;

      cursorRef.current = { x, y, clientX: event.clientX, clientY: event.clientY };
      showPortal(x, y);
    };

    const onEnter = (event: MouseEvent) => {
      onMove(event);
    };

    const onClick = () => {
      doTransition();
    };

      if (finePointer) {
        showPortal(startX, startY);
        setBubbleVisibility(true);
        animationFrameRef.current = window.requestAnimationFrame(animatePortal);
        hero.addEventListener("mousemove", onMove, { passive: true });
      hero.addEventListener("mouseenter", onEnter);
      hero.addEventListener("mouseleave", hidePortal);
    }

    hero.addEventListener("click", onClick);

    return () => {
      if (finePointer) {
        hero.removeEventListener("mousemove", onMove);
        hero.removeEventListener("mouseenter", onEnter);
        hero.removeEventListener("mouseleave", hidePortal);
        setBubbleVisibility(false);
      }

      hero.removeEventListener("click", onClick);

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCreators = async () => {
      setIsLoading(true);
      const items = await loadFeaturedCreators();
      if (!cancelled) {
        setCreators(items);
        setIsLoading(false);
      }
    };

    void loadCreators();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  const featuredCreatorHref = creators[0] ? `/creators/${creators[0].slug}` : "/signup";

  return (
    <div className="landing-page">
      <section className="video-hero" ref={heroRef}>
        <video
          aria-hidden="true"
          autoPlay
          className="video-layer"
          loop
          muted
          playsInline
          ref={videoARef}
        />
        <video
          aria-hidden="true"
          autoPlay
          className="video-layer"
          loop
          muted
          playsInline
          ref={videoBRef}
        />
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            aria-hidden="true"
            className={`portal-bubble portal-bubble--${index + 1}`}
            key={`portal-bubble-${index}`}
            ref={(node) => {
              portalBubbleRefs.current[index] = node;
            }}
          />
        ))}

        <div className="video-hero-content">
          <div className="hero-type-lockup">
            <span className="eyebrow-chip-light">Premium Creator Platform</span>
            <h1 className="video-hero-title">
              Your creative world,
              <br />
              <span className="title-accent">beautifully supported.</span>
            </h1>
            <p className="video-hero-subtext">
              ArtBlock is where creators and fans build something lasting.
              <br />
              Direct access, recurring support, and editorial presentation for your best work.
            </p>

            <div className="hero-actions-centered">
              <Link className="button-rust-large hero-cta-primary" to="/signup">
                <span className="hero-cta-primary__title">Start your page</span>
                <span className="hero-cta-primary__meta">Free setup. Publish in minutes.</span>
              </Link>
              <Link className="button-ghost-large hero-cta-secondary" to={featuredCreatorHref}>
                <span className="hero-cta-secondary__title">Explore creators</span>
                <span className="hero-cta-secondary__meta">See live pages before you launch</span>
              </Link>
            </div>
          </div>

          <div className="hero-proof-row">
            {proofItems.map((item) => (
              <span className="proof-pill-light" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-command-dock" aria-label="Platform signals">
          {heroSignals.map((signal) => (
            <article className="hero-signal-card" key={signal.label}>
              <span className="hero-signal-label">{signal.label}</span>
              <strong>{signal.value}</strong>
              <p>{signal.meta}</p>
            </article>
          ))}
        </div>

        <div aria-hidden="true" className="scroll-hint">
          <span>Scroll</span>
          <div className="scroll-line" />
        </div>

        <p aria-hidden="true" className="hero-click-hint">
          Click anywhere to explore
        </p>
      </section>

      <MomentumSection />

      <CreatorSpotlightSection creators={creators} isLoading={isLoading} />

      <SignalConsole />

      <ImmersionSection />
    </div>
  );
};
