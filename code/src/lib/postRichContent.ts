export type PostTitleFont = "space" | "onest" | "poppins";
export type PostTextAlign = "left" | "center" | "right";
export type PostBackgroundMode = "none" | "solid" | "gradient";

export type RichPostStyle = {
  titleColor: string;
  bodyColor: string;
  titleSize: number;
  bodySize: number;
  titleWeight: 700 | 800 | 900;
  bodyWeight: 400 | 500 | 600 | 700;
  titleFont: PostTitleFont;
  textAlign: PostTextAlign;
  backgroundMode: PostBackgroundMode;
  backgroundColor: string;
  backgroundColorSecondary: string;
};

export type RichPostPayload = {
  version: 1;
  title: string | null;
  body: string | null;
  style: RichPostStyle;
};

export const defaultRichPostStyle: RichPostStyle = {
  titleColor: "#111111",
  bodyColor: "#2e2e2b",
  titleSize: 28,
  bodySize: 16,
  titleWeight: 800,
  bodyWeight: 500,
  titleFont: "space",
  textAlign: "left",
  backgroundMode: "none",
  backgroundColor: "#fff3c4",
  backgroundColorSecondary: "#f59e0b"
};

const RICH_POST_MARKER = "__artblock_rich_post__:";

export const serializeRichPostPayload = (payload: RichPostPayload) =>
  `${RICH_POST_MARKER}${JSON.stringify(payload)}`;

export const parseRichPostPayload = (title: string | null, body: string | null): RichPostPayload | null => {
  if (!body || !body.startsWith(RICH_POST_MARKER)) {
    return null;
  }

  try {
    const parsed = JSON.parse(body.slice(RICH_POST_MARKER.length)) as Partial<RichPostPayload>;
    if (parsed.version !== 1 || !parsed.style) {
      return null;
    }

    return {
      version: 1,
      title: parsed.title ?? title ?? null,
      body: parsed.body ?? null,
      style: {
        ...defaultRichPostStyle,
        ...parsed.style
      }
    };
  } catch {
    return null;
  }
};

export const getPostContentText = (title: string | null, body: string | null) => {
  const rich = parseRichPostPayload(title, body);

  if (rich) {
    return {
      isRich: true,
      title: rich.title,
      body: rich.body,
      style: rich.style
    };
  }

  return {
    isRich: false,
    title,
    body,
    style: defaultRichPostStyle
  };
};

export const getTitleFontFamily = (font: PostTitleFont) => {
  if (font === "onest") {
    return '"Onest", "Segoe UI", sans-serif';
  }

  if (font === "poppins") {
    return '"Poppins", "Segoe UI", sans-serif';
  }

  return '"Space Grotesk", "Segoe UI", sans-serif';
};

export const getRichPostStyleVars = (style: RichPostStyle, enableBackground: boolean) => ({
  "--post-title-color": style.titleColor,
  "--post-body-color": style.bodyColor,
  "--post-title-size": `${style.titleSize}px`,
  "--post-body-size": `${style.bodySize}px`,
  "--post-title-weight": String(style.titleWeight),
  "--post-body-weight": String(style.bodyWeight),
  "--post-title-font": getTitleFontFamily(style.titleFont),
  "--post-text-align": style.textAlign,
  "--post-background":
    enableBackground && style.backgroundMode === "solid"
      ? style.backgroundColor
      : enableBackground && style.backgroundMode === "gradient"
        ? `linear-gradient(135deg, ${style.backgroundColor}, ${style.backgroundColorSecondary})`
        : "transparent"
});
