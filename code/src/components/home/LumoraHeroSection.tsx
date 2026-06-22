import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import artisticIndianLadyHeroImage from "../../public/images/lumora-indian-lady-artistic.png";
import indianLadyHeroImage from "../../public/images/lumora-indian-lady.png";

const baseHeroImage = indianLadyHeroImage;
const revealHeroImage = artisticIndianLadyHeroImage;

const heroSlides = [
  {
    caption: "Conversion design",
    title: "Crafted to convert."
  },
  {
    caption: "Engineering",
    title: "Built to scale."
  },
  {
    caption: "Brand systems",
    title: "Designed to last."
  }
];

const partnerNames = ["Kaido", "Northpeak", "Vellum", "Orbit", "Brightline", "Cobalt", "Mesa"];

const desktopNavItems = [
  { label: "Home", type: "scroll" as const, target: "lumora-home" },
  { label: "Work", type: "scroll" as const, target: "programs" },
  { label: "Services", type: "scroll" as const, target: "facilities" },
  { label: "Studio", type: "scroll" as const, target: "testimonials" },
  { label: "Careers", type: "modal" as const },
  { label: "Contact", type: "scroll" as const, target: "contact" }
];

const menuItems = [
  { index: "01", label: "Home", type: "scroll" as const, target: "lumora-home" },
  { index: "02", label: "Work", type: "scroll" as const, target: "programs" },
  { index: "03", label: "Services", type: "scroll" as const, target: "facilities" },
  { index: "04", label: "Studio", type: "scroll" as const, target: "testimonials" },
  { index: "05", label: "Careers", type: "modal" as const },
  { index: "06", label: "Contact", type: "scroll" as const, target: "contact" }
];

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const formatClock = (date: Date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 || 12;

  return {
    time: `${displayHour}:${String(minutes).padStart(2, "0")}${period}`,
    date: `${date.getDate()} ${monthNames[date.getMonth()]}, ${date.getFullYear()}`
  };
};

const drawCoverImage = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
) => {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;

  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
};

const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
  </svg>
);

const ArrowUpRightIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
  </svg>
);

const StarIcon = () => (
  <svg aria-hidden="true" className="lumora-star" viewBox="0 0 24 24">
    <path d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.9l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.94L12 2.5z" />
  </svg>
);

const GridIcon = () => (
  <svg aria-hidden="true" className="lumora-menu-icon" fill="none" viewBox="0 0 24 24">
    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
  </svg>
);

const CloseIcon = () => (
  <svg aria-hidden="true" className="lumora-close-icon" fill="none" viewBox="0 0 24 24">
    <path d="M4 4l16 16M20 4 4 20" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
  </svg>
);

const CircleDotIcon = () => (
  <svg aria-hidden="true" className="lumora-partner-icon" fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="3.2" fill="currentColor" />
  </svg>
);

const BrandMarkIcon = ({ className }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 48 42">
    <path
      d="M3.5 38.5C11.2 33.7 17.7 25.9 21.2 16C22.3 12.8 23.1 9.5 23.8 5.2C24.2 2.9 24.3 2.8 24.6 4.8C26.5 17.6 34.1 29.4 44.8 38.5C33.4 33.6 15.1 33.6 3.5 38.5Z"
      fill="currentColor"
    />
    <path
      d="M14.8 17.6C16.8 18.6 19 19 21.4 19C24.5 19 27.1 18.3 30 16.6"
      stroke="#ffffff"
      strokeLinecap="round"
      strokeWidth="2"
    />
  </svg>
);

type PillButtonProps = {
  children: ReactNode;
  icon?: "right" | "up-right";
  onClick?: () => void;
  tone: "dark" | "outline";
  type?: "button" | "submit";
};

const PillButton = ({ children, icon, onClick, tone, type = "button" }: PillButtonProps) => (
  <button
    className={`lumora-pill-button lumora-pill-button--${tone}${icon ? " lumora-pill-button--icon" : ""}`}
    onClick={onClick}
    type={type}
  >
    <span>{children}</span>
    {icon ? (
      <span className="lumora-pill-button__icon-shell">
        {icon === "right" ? (
          <ArrowRightIcon className="lumora-pill-button__icon lumora-pill-button__icon--right" />
        ) : (
          <ArrowUpRightIcon className="lumora-pill-button__icon lumora-pill-button__icon--up-right" />
        )}
      </span>
    ) : null}
  </button>
);

const BrandLogo = ({
  className,
  tone
}: {
  className?: string;
  tone: "dark" | "light";
}) => (
  <span className={`${className ?? ""} lumora-brand__lockup lumora-brand__lockup--${tone}`.trim()}>
    <BrandMarkIcon className="lumora-brand__mark" />
    <span className="lumora-brand__text">Artblock</span>
  </span>
);

export const LumoraHeroSection = () => {
  const navigate = useNavigate();
  const [clock, setClock] = useState({ time: "9:41am", date: "12 March, 2025" });
  const [isReady, setReady] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [headerLogoTone, setHeaderLogoTone] = useState<"dark" | "light">("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [pointerFine, setPointerFine] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    project: ""
  });
  const heroRef = useRef<HTMLElement | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const headerLogoRef = useRef<HTMLButtonElement | null>(null);
  const formResetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const updateClock = () => {
      setClock(formatClock(new Date()));
    };

    updateClock();
    const interval = window.setInterval(updateClock, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const readyTimer = window.setTimeout(() => {
      setReady(true);
    }, 120);

    return () => {
      window.clearTimeout(readyTimer);
    };
  }, []);

  useEffect(() => {
    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncPreferences = () => {
      setPointerFine(pointerQuery.matches);
      setReduceMotion(motionQuery.matches);
    };

    syncPreferences();
    pointerQuery.addEventListener("change", syncPreferences);
    motionQuery.addEventListener("change", syncPreferences);

    return () => {
      pointerQuery.removeEventListener("change", syncPreferences);
      motionQuery.removeEventListener("change", syncPreferences);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    if (menuOpen || modalOpen) {
      root.style.overflow = "hidden";
    } else {
      root.style.removeProperty("overflow");
    }

    return () => {
      root.style.removeProperty("overflow");
    };
  }, [menuOpen, modalOpen]);

  useEffect(() => {
    if (!menuOpen && !modalOpen) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, modalOpen]);

  useEffect(() => {
    const openContactModal = () => {
      setMenuOpen(false);
      setModalOpen(true);
    };

    window.addEventListener("lumora:open-contact", openContactModal);

    return () => {
      window.removeEventListener("lumora:open-contact", openContactModal);
    };
  }, []);

  useEffect(() => {
    const host = heroRef.current;
    const canvas = canvasRef.current;

    if (!host || !canvas || reduceMotion || !pointerFine) {
      if (canvas) {
        const context = canvas.getContext("2d");
        context?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return undefined;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return undefined;
    }

    const revealImage = new Image();
    revealImage.crossOrigin = "anonymous";
    revealImage.src = revealHeroImage;

    const brushRadius = 143;
    const decay = 0.016;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let radius = 0;
    let diameter = 0;
    let lastPoint: { x: number; y: number } | null = null;
    let idleFrames = 0;
    let animationFrame = 0;
    let imageReady = false;
    const points: Array<{ x: number; y: number }> = [];
    const coverCanvas = document.createElement("canvas");
    const coverContext = coverCanvas.getContext("2d");
    const brushCanvas = document.createElement("canvas");
    const brushContext = brushCanvas.getContext("2d");

    if (!coverContext || !brushContext) {
      return undefined;
    }

    const resize = () => {
      const rect = host.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(Math.round(rect.width * dpr), 1);
      height = Math.max(Math.round(rect.height * dpr), 1);
      radius = brushRadius * dpr;
      diameter = Math.ceil(radius * 2);

      canvas.width = width;
      canvas.height = height;
      coverCanvas.width = width;
      coverCanvas.height = height;
      brushCanvas.width = diameter;
      brushCanvas.height = diameter;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      if (imageReady) {
        drawCover();
      }
    };

    const drawCover = () => {
      coverContext.clearRect(0, 0, width, height);
      const scale = Math.max(width / revealImage.width, height / revealImage.height);
      const drawWidth = revealImage.width * scale;
      const drawHeight = revealImage.height * scale;
      const offsetX = (width - drawWidth) / 2;
      const offsetY = (height - drawHeight) / 2;

      coverContext.drawImage(revealImage, offsetX, offsetY, drawWidth, drawHeight);
    };

    const stamp = (x: number, y: number) => {
      const center = diameter / 2;
      const auraRadius = radius * 1.22;
      brushContext.clearRect(0, 0, diameter, diameter);

      const gradient = brushContext.createRadialGradient(center, center, 0, center, center, center);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.55, "rgba(255,255,255,0.82)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");

      brushContext.globalCompositeOperation = "source-over";
      brushContext.fillStyle = gradient;
      brushContext.fillRect(0, 0, diameter, diameter);

      brushContext.globalCompositeOperation = "source-in";
      brushContext.drawImage(coverCanvas, x - center, y - center, diameter, diameter, 0, 0, diameter, diameter);
      brushContext.globalCompositeOperation = "source-over";

      const aura = context.createRadialGradient(x, y, 0, x, y, auraRadius);
      aura.addColorStop(0, "rgba(244, 234, 255, 0.3)");
      aura.addColorStop(0.36, "rgba(207, 166, 255, 0.24)");
      aura.addColorStop(0.7, "rgba(155, 102, 255, 0.12)");
      aura.addColorStop(1, "rgba(155, 102, 255, 0)");

      context.save();
      context.globalCompositeOperation = "screen";
      context.fillStyle = aura;
      context.beginPath();
      context.arc(x, y, auraRadius, 0, Math.PI * 2);
      context.fill();
      context.restore();

      context.drawImage(brushCanvas, x - center, y - center);
    };

    const queuePoint = (x: number, y: number) => {
      if (!lastPoint) {
        points.push({ x, y });
        lastPoint = { x, y };
        return;
      }

      const distance = Math.hypot(x - lastPoint.x, y - lastPoint.y);
      const step = Math.max(radius * 0.3, 1);
      const count = Math.min(Math.ceil(distance / step), 60);

      for (let index = 1; index <= count; index += 1) {
        const progress = index / count;
        points.push({
          x: lastPoint.x + (x - lastPoint.x) * progress,
          y: lastPoint.y + (y - lastPoint.y) * progress
        });
      }

      lastPoint = { x, y };
    };

    const tick = () => {
      const drawing = points.length > 0;

      if (drawing) {
        idleFrames = 0;
      } else {
        idleFrames += 1;
      }

      if (drawing || idleFrames <= 120) {
        const fade = drawing ? decay : Math.min(decay + idleFrames * 0.004, 0.5);
        context.globalCompositeOperation = "destination-out";
        context.fillStyle = `rgba(0, 0, 0, ${fade})`;
        context.fillRect(0, 0, width, height);
        context.globalCompositeOperation = "source-over";
      }

      if (drawing) {
        points.splice(0).forEach((point) => stamp(point.x, point.y));
      } else if (idleFrames === 120) {
        context.clearRect(0, 0, width, height);
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        return;
      }

      const rect = host.getBoundingClientRect();
      const x = (event.clientX - rect.left) * dpr;
      const y = (event.clientY - rect.top) * dpr;

      if (x < -radius || y < -radius || x > width + radius || y > height + radius) {
        lastPoint = null;
        return;
      }

      queuePoint(x, y);
    };

    const onPointerLeave = () => {
      lastPoint = null;
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });

    resizeObserver.observe(host);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    host.addEventListener("pointerleave", onPointerLeave);

    revealImage.onload = () => {
      imageReady = true;
      resize();
      animationFrame = window.requestAnimationFrame(tick);
    };

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [pointerFine, reduceMotion]);

  useEffect(() => {
    const host = heroRef.current;
    const logo = headerLogoRef.current;
    const baseImage = baseImageRef.current;
    const revealCanvas = canvasRef.current;

    if (!host || !logo || !baseImage || !revealCanvas) {
      return undefined;
    }

    const scratchCanvas = document.createElement("canvas");
    const scratchContext = scratchCanvas.getContext("2d", { willReadFrequently: true });

    if (!scratchContext) {
      return undefined;
    }

    let frameId = 0;

    const updateLogoTone = () => {
      const hostRect = host.getBoundingClientRect();
      const logoRect = logo.getBoundingClientRect();

      if (hostRect.width <= 0 || hostRect.height <= 0 || baseImage.naturalWidth <= 0 || baseImage.naturalHeight <= 0) {
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(Math.round(hostRect.width * dpr), 1);
      const height = Math.max(Math.round(hostRect.height * dpr), 1);

      scratchCanvas.width = width;
      scratchCanvas.height = height;
      scratchContext.clearRect(0, 0, width, height);
      drawCoverImage(scratchContext, baseImage, width, height);

      if (revealCanvas.width > 0 && revealCanvas.height > 0) {
        scratchContext.drawImage(revealCanvas, 0, 0, width, height);
      }

      let totalLuminance = 0;
      let samples = 0;

      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 6; column += 1) {
          const sampleX = logoRect.left - hostRect.left + logoRect.width * (0.16 + column * 0.136);
          const sampleY = logoRect.top - hostRect.top + logoRect.height * (0.22 + row * 0.18);
          const pixelX = Math.min(Math.max(Math.round(sampleX * dpr), 0), width - 1);
          const pixelY = Math.min(Math.max(Math.round(sampleY * dpr), 0), height - 1);
          const pixel = scratchContext.getImageData(pixelX, pixelY, 1, 1).data;

          totalLuminance += 0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2];
          samples += 1;
        }
      }

      const averageLuminance = samples > 0 ? totalLuminance / samples : 255;
      setHeaderLogoTone(averageLuminance > 154 ? "dark" : "light");
    };

    const scheduleUpdate = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(updateLogoTone);
    };

    const handleImageLoad = () => {
      scheduleUpdate();
    };

    if (baseImage.complete) {
      scheduleUpdate();
    } else {
      baseImage.addEventListener("load", handleImageLoad);
    }

    const resizeObserver = new ResizeObserver(() => {
      scheduleUpdate();
    });

    resizeObserver.observe(host);
    resizeObserver.observe(logo);
    host.addEventListener("pointermove", scheduleUpdate, { passive: true });
    host.addEventListener("pointerleave", scheduleUpdate);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (!baseImage.complete) {
        baseImage.removeEventListener("load", handleImageLoad);
      }
      resizeObserver.disconnect();
      host.removeEventListener("pointermove", scheduleUpdate);
      host.removeEventListener("pointerleave", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.cancelAnimationFrame(frameId);
    };
  }, [isReady, pointerFine, reduceMotion]);

  useEffect(() => {
    return () => {
      if (formResetTimeoutRef.current !== null) {
        window.clearTimeout(formResetTimeoutRef.current);
      }
    };
  }, []);

  const scrollToId = (id: string) => {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNavAction = (item: { type: "scroll" | "modal"; target?: string }) => {
    if (item.type === "modal") {
      setMenuOpen(false);
      setModalOpen(true);
      return;
    }

    if (item.target) {
      setMenuOpen(false);
      scrollToId(item.target);
    }
  };

  const moveSlide = (direction: 1 | -1) => {
    setActiveSlide((current) => (current + direction + heroSlides.length) % heroSlides.length);
  };

  const closeModal = () => {
    setModalOpen(false);

    if (requestSent) {
      formResetTimeoutRef.current = window.setTimeout(() => {
        setRequestSent(false);
        setSubmitting(false);
        setFormState({ name: "", email: "", project: "" });
      }, 300);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    window.setTimeout(() => {
      setSubmitting(false);
      setRequestSent(true);
    }, 800);
  };

  return (
    <>
      <section className="lumora-hero" id="lumora-home" ref={heroRef}>
        <div className="lumora-hero__media">
          <img alt="" className="lumora-hero__base-image" ref={baseImageRef} src={baseHeroImage} />
          <canvas aria-hidden="true" className="lumora-hero__reveal-canvas" ref={canvasRef} />
        </div>
        <div aria-hidden="true" className="lumora-hero__vignette" />
        <div className={`lumora-hero__watermark${isReady ? " is-visible" : ""}`}>ARTBLOCK</div>

        <header className={`lumora-hero__header${isReady ? " is-visible" : ""}`}>
          <div className="lumora-shell lumora-hero__header-shell">
            <button
              className="lumora-brand lumora-brand--header"
              onClick={() => scrollToId("lumora-home")}
              ref={headerLogoRef}
              type="button"
            >
              <BrandLogo className="lumora-brand__image" tone={headerLogoTone} />
            </button>

            <nav aria-label="Primary" className="lumora-nav">
              <ul className="lumora-nav__list">
                {desktopNavItems.map((item) => (
                  <li key={item.label}>
                    <button
                      aria-current={item.label === "Home" ? "page" : undefined}
                      className="lumora-nav__button"
                      onClick={() => handleNavAction(item)}
                      type="button"
                    >
                      <span>{item.label}</span>
                      {item.label === "Services" ? <span className="lumora-nav__caret">▾</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="lumora-hero__header-actions">
              <div className="lumora-clock-chip">
                <span className="lumora-clock-chip__label">Local time</span>
                <span className="lumora-clock-chip__value">{clock.time}</span>
                <span className="lumora-clock-chip__separator">•</span>
                <span className="lumora-clock-chip__value">{clock.date}</span>
              </div>

              <button
                aria-expanded={menuOpen}
                className="lumora-menu-button"
                onClick={() => setMenuOpen(true)}
                type="button"
              >
                <span className="lumora-menu-button__inner">
                  <GridIcon />
                  <span className="lumora-menu-button__label">Menu</span>
                </span>
              </button>
            </div>
          </div>
        </header>

        <div className="lumora-shell lumora-hero__content-shell">
          <div className="lumora-hero__content-grid">
            <div className="lumora-hero__copy">
              <div className={`lumora-hero__eyebrow lumora-reveal lumora-reveal--eyebrow${isReady ? " is-visible" : ""}`}>
                <span className="lumora-hero__eyebrow-dot" />
                <span>Independent Studio</span>
              </div>

              <h1 className={`lumora-hero__title${isReady ? " is-visible" : ""}`}>
                {["Creativity,", "that brings", "brands together"].map((line, index) => (
                  <span
                    className="lumora-hero__title-line"
                    key={line}
                    style={{ transitionDelay: `${250 + index * 120}ms` }}
                  >
                    <span>{line}</span>
                  </span>
                ))}
              </h1>

              <div className={`lumora-rating-row lumora-reveal${isReady ? " is-visible" : ""}`} style={{ transitionDelay: "650ms" }}>
                <span className="lumora-rating-row__stars">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <StarIcon key={`star-${index}`} />
                  ))}
                </span>
                <span>200+ brands shipped</span>
              </div>

              <div className={`lumora-hero__cta-row lumora-reveal${isReady ? " is-visible" : ""}`} style={{ transitionDelay: "750ms" }}>
                <PillButton icon="up-right" onClick={() => navigate("/login")} tone="dark">
                  Get started
                </PillButton>
                <PillButton icon="right" onClick={() => setModalOpen(true)} tone="outline">
                  Contact us
                </PillButton>
              </div>
            </div>

            <div className="lumora-hero__aside">
              <article
                className={`lumora-hero-card lumora-reveal${isReady ? " is-visible" : ""}`}
                onClick={() => moveSlide(1)}
                style={{ transitionDelay: "400ms" }}
              >
                <div className="lumora-hero-card__mark">
                  <BrandLogo className="lumora-hero-card__logo" tone="light" />
                </div>
                <div className="lumora-hero-card__content">
                  <div className="lumora-hero-card__copy" key={activeSlide}>
                    <span className="lumora-hero-card__caption">{heroSlides[activeSlide].caption}</span>
                    <strong>{heroSlides[activeSlide].title}</strong>
                  </div>
                  <div className="lumora-hero-card__footer">
                    <div className="lumora-hero-card__dots">
                      {heroSlides.map((_, index) => (
                        <span
                          className={index === activeSlide ? "is-active" : ""}
                          key={`dot-${index}`}
                        />
                      ))}
                    </div>
                    <div className="lumora-hero-card__actions">
                      <button
                        aria-label="Previous slide"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveSlide(-1);
                        }}
                        type="button"
                      >
                        <ArrowRightIcon className="lumora-hero-card__arrow lumora-hero-card__arrow--prev" />
                      </button>
                      <button
                        aria-label="Next slide"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveSlide(1);
                        }}
                        type="button"
                      >
                        <ArrowRightIcon className="lumora-hero-card__arrow" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>

              <div className={`lumora-partners lumora-reveal${isReady ? " is-visible" : ""}`} style={{ transitionDelay: "550ms" }}>
                <p className="lumora-partners__label">Trusted by</p>
                <ul className="lumora-partners__grid">
                  {partnerNames.map((name) => (
                    <li key={name}>
                      <span className="lumora-partners__item">
                        <CircleDotIcon />
                        <span>{name}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className={`lumora-hero__status lumora-reveal${isReady ? " is-visible" : ""}`} style={{ transitionDelay: "900ms" }}>
          <div className="lumora-shell lumora-hero__status-shell">
            <span>Working since 2014</span>
            <span className="lumora-hero__status-center">Remote-first, worldwide</span>
            <span className="lumora-hero__status-right">Scroll to explore ↓</span>
          </div>
        </div>
      </section>

      {menuOpen ? (
        <div className="lumora-menu-overlay" role="dialog" aria-modal="true">
          <div className="lumora-shell lumora-menu-overlay__topbar">
            <div className="lumora-brand lumora-brand--inverse">
              <BrandLogo className="lumora-brand__image" tone="light" />
            </div>
            <button className="lumora-menu-overlay__close" onClick={() => setMenuOpen(false)} type="button">
              <CloseIcon />
              <span>Close</span>
            </button>
          </div>

          <div className="lumora-shell lumora-menu-overlay__content">
            <ul className="lumora-menu-overlay__list">
              {menuItems.map((item, index) => (
                <li
                  className="lumora-menu-overlay__item"
                  key={item.label}
                  style={{ transitionDelay: `${80 + index * 45}ms` }}
                >
                  <button onClick={() => handleNavAction(item)} type="button">
                    <span className="lumora-menu-overlay__index">{item.index}</span>
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lumora-shell lumora-menu-overlay__footer">
            <span>Local time — {clock.time}</span>
            <button
              className="lumora-menu-overlay__cta"
              onClick={() => {
                setMenuOpen(false);
                setModalOpen(true);
              }}
              type="button"
            >
              Start a project →
            </button>
          </div>
        </div>
      ) : null}

      {modalOpen ? (
        <div
          aria-modal="true"
          className="lumora-request-modal"
          onClick={closeModal}
          role="dialog"
        >
          <div
            className="lumora-request-modal__panel"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Close request modal"
              className="lumora-request-modal__close"
              onClick={closeModal}
              type="button"
            >
              <CloseIcon />
            </button>

            {!requestSent ? (
              <>
                <div className="lumora-request-modal__heading">
                  <div className="lumora-request-modal__eyebrow">
                    <span className="lumora-request-modal__dot" />
                    <span>Start a project</span>
                  </div>
                  <h2>Tell us what you&apos;re building.</h2>
                </div>

                <form className="lumora-request-modal__form" onSubmit={handleSubmit}>
                  <label>
                    <span>Name</span>
                    <input
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Your name"
                      required
                      type="text"
                      value={formState.name}
                    />
                  </label>

                  <label>
                    <span>Email</span>
                    <input
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="you@company.com"
                      required
                      type="email"
                      value={formState.email}
                    />
                  </label>

                  <label>
                    <span>Project</span>
                    <textarea
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, project: event.target.value }))
                      }
                      placeholder="A few words about your project, timeline, and budget."
                      required
                      rows={4}
                      value={formState.project}
                    />
                  </label>

                  <div className="lumora-request-modal__footer">
                    <p>We reply within one business day.</p>
                    <PillButton icon="up-right" tone="dark" type="submit">
                      {isSubmitting ? "Sending…" : "Send request"}
                    </PillButton>
                  </div>
                </form>
              </>
            ) : (
              <div className="lumora-request-modal__success">
                <div className="lumora-request-modal__success-mark">
                  <BrandLogo className="lumora-request-modal__success-logo" tone="light" />
                </div>
                <h2>Request received</h2>
                <p>
                  Thanks for reaching out — we&apos;ll get back to you within one business
                  day.
                </p>
                <PillButton onClick={closeModal} tone="dark">
                  Close
                </PillButton>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};
