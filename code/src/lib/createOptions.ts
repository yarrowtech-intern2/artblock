import type { FeedPostType } from "./supabase.types";

export type CreateOptionId = FeedPostType | "short" | "story";

export type CreateOption = {
  id: CreateOptionId;
  label: string;
  shortLabel: string;
  description: string;
  href: {
    pathname: string;
    search?: string;
  };
};

export const createOptions: CreateOption[] = [
  {
    id: "image",
    label: "Image",
    shortLabel: "Image",
    description: "Photo posts for the main feed.",
    href: { pathname: "/create", search: "?type=image" }
  },
  {
    id: "video",
    label: "Video",
    shortLabel: "Video",
    description: "Landscape or portrait video posts for the feed.",
    href: { pathname: "/create", search: "?type=video" }
  },
  {
    id: "poll",
    label: "Polls",
    shortLabel: "Polls",
    description: "Question posts with multiple choices.",
    href: { pathname: "/create", search: "?type=poll" }
  },
  {
    id: "text",
    label: "Text",
    shortLabel: "Text",
    description: "Rich text cards with styling controls.",
    href: { pathname: "/create", search: "?type=text" }
  },
  {
    id: "short",
    label: "Shorts",
    shortLabel: "Shorts",
    description: "Short-form vertical reels.",
    href: { pathname: "/create", search: "?type=short" }
  },
  {
    id: "story",
    label: "Story",
    shortLabel: "Story",
    description: "24-hour stories that disappear automatically.",
    href: { pathname: "/create", search: "?type=story" }
  }
];

export const isFeedComposerType = (value: string | null): value is FeedPostType =>
  value === "image" || value === "video" || value === "poll" || value === "text";

export const isCreateOptionId = (value: string | null): value is CreateOptionId =>
  value === "image" ||
  value === "video" ||
  value === "poll" ||
  value === "text" ||
  value === "short" ||
  value === "story";
