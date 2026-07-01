import type { Session, User } from "@supabase/supabase-js";
import type {
  AppRole,
  FeedPostType,
  NotificationType,
  PostSurface,
  ProfileGender,
  StoryMediaKind
} from "../lib/supabase.types";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  is_verified_artist: boolean;
  verified_artist_at: string | null;
  bio: string | null;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  gender: ProfileGender | null;
  website: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export type CreatorProfile = {
  id: string;
  slug: string;
  headline: string | null;
  about: string | null;
  featured_quote: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicCreatorProfile = {
  id: string;
  slug: string;
  full_name: string;
  is_verified_artist: boolean;
  verified_artist_at: string | null;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  gender: ProfileGender | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  headline: string | null;
  about: string | null;
  featured_quote: string | null;
  profile_visibility: ProfileVisibility;
};

export type ProfileVisibility = "public" | "members" | "private";
export type InteractionPermission = "everyone" | "followers" | "nobody";

export type UserSettings = {
  profile_id: string;
  keep_me_signed_in: boolean;
  profile_visibility: ProfileVisibility;
  message_permissions: InteractionPermission;
  comment_permissions: InteractionPermission;
  notify_new_followers: boolean;
  notify_new_subscribers: boolean;
  notify_new_messages: boolean;
  notify_post_likes: boolean;
  notify_post_comments: boolean;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicProfile = {
  id: string;
  full_name: string;
  is_verified_artist: boolean;
  verified_artist_at: string | null;
  username: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  gender: ProfileGender | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  role: AppRole;
  creator_slug: string | null;
  headline: string | null;
  about: string | null;
  featured_quote: string | null;
  profile_visibility: ProfileVisibility;
  message_permissions: InteractionPermission;
  viewer_can_message: boolean;
  follower_count: number;
  following_count: number;
  subscriber_count: number;
  post_count: number;
};

export type ProfileRelationshipState = {
  is_following: boolean;
  is_subscribed: boolean;
};

export type ProfileConnectionItem = {
  id: string;
  full_name: string;
  role: AppRole;
  is_verified_artist: boolean;
  username: string | null;
  avatar_url: string | null;
  creator_slug: string | null;
  headline: string | null;
};

export type FeedComment = {
  id: string;
  post_id: string;
  body: string;
  created_at: string;
  author_id: string;
  full_name: string;
  author_role: AppRole;
  author_is_verified_artist: boolean;
  username: string | null;
  avatar_url: string | null;
};

export type PollOption = {
  option_id: string;
  post_id: string;
  label: string;
  position: number;
  vote_count: number;
};

export type FeedPost = {
  id: string;
  author_id: string;
  post_type: FeedPostType;
  surface?: PostSurface;
  title: string | null;
  body: string | null;
  media_url: string | null;
  thumbnail_url?: string | null;
  media_duration_seconds?: number | null;
  media_width?: number | null;
  media_height?: number | null;
  tip_enabled?: boolean;
  share_count?: number;
  tip_total_paise?: number;
  created_at: string;
  is_pinned: boolean;
  full_name: string;
  author_role: AppRole;
  is_verified_artist: boolean;
  username: string | null;
  avatar_url: string | null;
  creator_slug: string | null;
  headline: string | null;
  comment_permissions: InteractionPermission;
  viewer_can_comment: boolean;
  like_count: number;
  comment_count: number;
  liked_by_viewer: boolean;
  saved_by_viewer: boolean;
  poll_options: PollOption[];
  voted_option_id: string | null;
  comments: FeedComment[];
};

export type ShortPost = FeedPost & {
  surface: "short";
  thumbnail_url: string | null;
  media_duration_seconds: number | null;
  media_width: number | null;
  media_height: number | null;
  tip_enabled: boolean;
  share_count: number;
  tip_total_paise: number;
};

export type StoryItem = {
  id: string;
  author_id: string;
  media_kind: StoryMediaKind;
  media_url: string;
  media_storage_path: string | null;
  thumbnail_url: string | null;
  thumbnail_storage_path: string | null;
  body: string | null;
  media_duration_seconds: number | null;
  media_width: number | null;
  media_height: number | null;
  compression_status: string;
  expires_at: string;
  created_at: string;
  full_name: string;
  author_role: AppRole;
  is_verified_artist: boolean;
  username: string | null;
  avatar_url: string | null;
  creator_slug: string | null;
  headline: string | null;
  viewed_by_viewer: boolean;
};

export type StoryGroup = {
  author_id: string;
  full_name: string;
  author_role: AppRole;
  is_verified_artist: boolean;
  username: string | null;
  avatar_url: string | null;
  creator_slug: string | null;
  headline: string | null;
  items: StoryItem[];
  has_unviewed: boolean;
  latest_created_at: string;
};

export type StoryViewReceipt = {
  id: string;
  full_name: string;
  role: AppRole;
  is_verified_artist: boolean;
  username: string | null;
  avatar_url: string | null;
  creator_slug: string | null;
  headline: string | null;
  viewed_at: string;
};

export type InboxThread = {
  thread_id: string;
  peer_id: string;
  peer_full_name: string;
  peer_is_verified_artist: boolean;
  peer_username: string | null;
  peer_avatar_url: string | null;
  peer_role: AppRole;
  last_message_body: string | null;
  last_message_created_at: string | null;
  unread_count: number;
  message_count: number;
};

export type DirectMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  full_name: string;
  sender_role: AppRole;
  is_verified_artist: boolean;
  username: string | null;
  avatar_url: string | null;
};

export type NotificationItem = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  actor_full_name: string | null;
  actor_role: AppRole | null;
  actor_is_verified_artist: boolean;
  actor_username: string | null;
  actor_avatar_url: string | null;
};

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "disabled";

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  settings: UserSettings | null;
  status: AuthStatus;
  error: string | null;
  signIn: (input: SignInInput) => Promise<{ error: string | null }>;
  signUp: (input: SignUpInput) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateSettings: (
    input: Partial<
      Pick<
        UserSettings,
        | "keep_me_signed_in"
        | "profile_visibility"
        | "message_permissions"
        | "comment_permissions"
        | "notify_new_followers"
        | "notify_new_subscribers"
        | "notify_new_messages"
        | "notify_post_likes"
        | "notify_post_comments"
      >
    >
  ) => Promise<{ error: string | null }>;
};

export type SignInInput = {
  email: string;
  password: string;
  keepMeSignedIn: boolean;
};

export type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
  role: AppRole;
  acceptedTerms: boolean;
};
