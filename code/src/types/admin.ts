import type { AppRole, FeedPostType } from "../lib/supabase.types";

export type Campaign = {
  id: string;
  name: string;
  image_url: string;
  destination_url: string;
  cta_label: string;
  open_in_new_tab: boolean;
  desktop_enabled: boolean;
  feed_enabled: boolean;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_system?: boolean;
  system_key?: string | null;
};

export type AdminStats = {
  totalUsers: number;
  totalAdmins: number;
  totalCreators: number;
  totalVisitors: number;
  blockedUsers: number;
  verifiedArtists: number;
  totalPosts: number;
  totalCampaigns: number;
  activeCampaigns: number;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  username: string | null;
  is_verified_artist: boolean;
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
  profile_visibility: "public" | "members" | "private" | null;
  creator_slug: string | null;
  creator_is_published: boolean;
};

export type AdminPostRecord = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: AppRole;
  post_type: FeedPostType;
  title: string | null;
  body: string | null;
  caption: string | null;
  media_url: string | null;
  is_published: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
};
