import type { Session, User } from "@supabase/supabase-js";
import type { AppRole, FeedPostType, NotificationType } from "../lib/supabase.types";

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
  bio: string | null;
  website: string | null;
  location: string | null;
  headline: string | null;
  about: string | null;
  featured_quote: string | null;
};

export type PublicProfile = {
  id: string;
  full_name: string;
  is_verified_artist: boolean;
  verified_artist_at: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  role: AppRole;
  creator_slug: string | null;
  headline: string | null;
  about: string | null;
  featured_quote: string | null;
  follower_count: number;
  following_count: number;
  subscriber_count: number;
  post_count: number;
};

export type ProfileRelationshipState = {
  is_following: boolean;
  is_subscribed: boolean;
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
  title: string | null;
  body: string | null;
  media_url: string | null;
  created_at: string;
  is_pinned: boolean;
  full_name: string;
  author_role: AppRole;
  is_verified_artist: boolean;
  username: string | null;
  avatar_url: string | null;
  creator_slug: string | null;
  headline: string | null;
  like_count: number;
  comment_count: number;
  liked_by_viewer: boolean;
  saved_by_viewer: boolean;
  poll_options: PollOption[];
  voted_option_id: string | null;
  comments: FeedComment[];
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
  status: AuthStatus;
  error: string | null;
  signIn: (input: SignInInput) => Promise<{ error: string | null }>;
  signUp: (input: SignUpInput) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = SignInInput & {
  fullName: string;
  role: AppRole;
  acceptedTerms: boolean;
};
