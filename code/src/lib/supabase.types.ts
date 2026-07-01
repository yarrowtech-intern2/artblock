export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "visitor" | "creator" | "admin";
export type FeedPostType = "image" | "video" | "poll" | "text";
export type PostSurface = "feed" | "short";
export type StoryMediaKind = "image" | "video";
export type ProfileGender = "male" | "female" | "non_binary" | "prefer_not_to_say";
export type NotificationType =
  | "new_follower"
  | "new_subscriber"
  | "new_message"
  | "post_like"
  | "post_comment";

export type Database = {
  public: {
    Tables: {
      profile_follows: {
        Row: {
          follower_id: string;
          followed_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          followed_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          followed_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      creator_subscriptions: {
        Row: {
          subscriber_id: string;
          creator_id: string;
          created_at: string;
        };
        Insert: {
          subscriber_id: string;
          creator_id: string;
          created_at?: string;
        };
        Update: {
          subscriber_id?: string;
          creator_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      direct_threads: {
        Row: {
          id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      direct_thread_members: {
        Row: {
          thread_id: string;
          user_id: string;
          created_at: string;
          last_read_at: string;
          last_message_at: string;
          unread_count: number;
        };
        Insert: {
          thread_id: string;
          user_id: string;
          created_at?: string;
          last_read_at?: string;
          last_message_at?: string;
          unread_count?: number;
        };
        Update: {
          thread_id?: string;
          user_id?: string;
          created_at?: string;
          last_read_at?: string;
          last_message_at?: string;
          unread_count?: number;
        };
        Relationships: [];
      };
      direct_messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string | null;
          type: NotificationType;
          title: string;
          body: string;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id?: string | null;
          type: NotificationType;
          title: string;
          body: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          actor_id?: string | null;
          type?: NotificationType;
          title?: string;
          body?: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          post_type: FeedPostType;
          surface: PostSurface;
          title: string | null;
          body: string | null;
          media_url: string | null;
          thumbnail_url: string | null;
          media_storage_path: string | null;
          thumbnail_storage_path: string | null;
          media_duration_seconds: number | null;
          media_width: number | null;
          media_height: number | null;
          compression_status: string;
          tip_enabled: boolean;
          caption: string | null;
          is_published: boolean;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          post_type?: FeedPostType;
          surface?: PostSurface;
          title?: string | null;
          body?: string | null;
          media_url?: string | null;
          thumbnail_url?: string | null;
          media_storage_path?: string | null;
          thumbnail_storage_path?: string | null;
          media_duration_seconds?: number | null;
          media_width?: number | null;
          media_height?: number | null;
          compression_status?: string;
          tip_enabled?: boolean;
          caption?: string | null;
          is_published?: boolean;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          post_type?: FeedPostType;
          surface?: PostSurface;
          title?: string | null;
          body?: string | null;
          media_url?: string | null;
          thumbnail_url?: string | null;
          media_storage_path?: string | null;
          thumbnail_storage_path?: string | null;
          media_duration_seconds?: number | null;
          media_width?: number | null;
          media_height?: number | null;
          compression_status?: string;
          tip_enabled?: boolean;
          caption?: string | null;
          is_published?: boolean;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      stories: {
        Row: {
          id: string;
          author_id: string;
          media_kind: FeedPostType;
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
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          media_kind: FeedPostType;
          media_url: string;
          media_storage_path?: string | null;
          thumbnail_url?: string | null;
          thumbnail_storage_path?: string | null;
          body?: string | null;
          media_duration_seconds?: number | null;
          media_width?: number | null;
          media_height?: number | null;
          compression_status?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          media_kind?: FeedPostType;
          media_url?: string;
          media_storage_path?: string | null;
          thumbnail_url?: string | null;
          thumbnail_storage_path?: string | null;
          body?: string | null;
          media_duration_seconds?: number | null;
          media_width?: number | null;
          media_height?: number | null;
          compression_status?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stories_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      story_views: {
        Row: {
          story_id: string;
          viewer_id: string;
          viewed_at: string;
        };
        Insert: {
          story_id: string;
          viewer_id: string;
          viewed_at?: string;
        };
        Update: {
          story_id?: string;
          viewer_id?: string;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey";
            columns: ["viewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      post_shares: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          platform: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          platform?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          platform?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      post_poll_options: {
        Row: {
          id: string;
          post_id: string;
          label: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          label: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          label?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      post_poll_votes: {
        Row: {
          id: string;
          post_id: string;
          option_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          option_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          option_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      post_reactions: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          reaction_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          reaction_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          reaction_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      post_bookmarks: {
        Row: {
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      creator_profiles: {
        Row: {
          id: string;
          slug: string;
          headline: string | null;
          about: string | null;
          featured_quote: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          slug: string;
          headline?: string | null;
          about?: string | null;
          featured_quote?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          headline?: string | null;
          about?: string | null;
          featured_quote?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "creator_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      campaigns: {
        Row: {
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
        };
        Insert: {
          id?: string;
          name: string;
          image_url: string;
          destination_url: string;
          cta_label?: string;
          open_in_new_tab?: boolean;
          desktop_enabled?: boolean;
          feed_enabled?: boolean;
          priority?: number;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          image_url?: string;
          destination_url?: string;
          cta_label?: string;
          open_in_new_tab?: boolean;
          desktop_enabled?: boolean;
          feed_enabled?: boolean;
          priority?: number;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaigns_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
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
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: AppRole;
          is_verified_artist?: boolean;
          verified_artist_at?: string | null;
          bio?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          cover_url?: string | null;
          gender?: ProfileGender | null;
          website?: string | null;
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: AppRole;
          is_verified_artist?: boolean;
          verified_artist_at?: string | null;
          bio?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          cover_url?: string | null;
          gender?: ProfileGender | null;
          website?: string | null;
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      artist_verification_payments: {
        Row: {
          id: string;
          profile_id: string;
          razorpay_order_id: string;
          razorpay_payment_id: string | null;
          amount_paise: number;
          currency: string;
          status: string;
          metadata: Json;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          razorpay_order_id: string;
          razorpay_payment_id?: string | null;
          amount_paise: number;
          currency?: string;
          status?: string;
          metadata?: Json;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          razorpay_order_id?: string;
          razorpay_payment_id?: string | null;
          amount_paise?: number;
          currency?: string;
          status?: string;
          metadata?: Json;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artist_verification_payments_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      artist_tips: {
        Row: {
          id: string;
          post_id: string | null;
          sender_id: string;
          recipient_id: string;
          razorpay_order_id: string;
          razorpay_payment_id: string | null;
          amount_paise: number;
          currency: string;
          message: string | null;
          status: string;
          metadata: Json;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id?: string | null;
          sender_id: string;
          recipient_id: string;
          razorpay_order_id: string;
          razorpay_payment_id?: string | null;
          amount_paise: number;
          currency?: string;
          message?: string | null;
          status?: string;
          metadata?: Json;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string | null;
          sender_id?: string;
          recipient_id?: string;
          razorpay_order_id?: string;
          razorpay_payment_id?: string | null;
          amount_paise?: number;
          currency?: string;
          message?: string | null;
          status?: string;
          metadata?: Json;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artist_tips_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artist_tips_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artist_tips_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      user_settings: {
        Row: {
          profile_id: string;
          keep_me_signed_in: boolean;
          profile_visibility: "public" | "members" | "private";
          message_permissions: "everyone" | "followers" | "nobody";
          comment_permissions: "everyone" | "followers" | "nobody";
          notify_new_followers: boolean;
          notify_new_subscribers: boolean;
          notify_new_messages: boolean;
          notify_post_likes: boolean;
          notify_post_comments: boolean;
          deactivated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          keep_me_signed_in?: boolean;
          profile_visibility?: "public" | "members" | "private";
          message_permissions?: "everyone" | "followers" | "nobody";
          comment_permissions?: "everyone" | "followers" | "nobody";
          notify_new_followers?: boolean;
          notify_new_subscribers?: boolean;
          notify_new_messages?: boolean;
          notify_post_likes?: boolean;
          notify_post_comments?: boolean;
          deactivated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          keep_me_signed_in?: boolean;
          profile_visibility?: "public" | "members" | "private";
          message_permissions?: "everyone" | "followers" | "nobody";
          comment_permissions?: "everyone" | "followers" | "nobody";
          notify_new_followers?: boolean;
          notify_new_subscribers?: boolean;
          notify_new_messages?: boolean;
          notify_post_likes?: boolean;
          notify_post_comments?: boolean;
          deactivated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_settings_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      public_creator_profiles: {
        Row: {
          id: string | null;
          slug: string | null;
          full_name: string | null;
          is_verified_artist: boolean | null;
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
          profile_visibility: "public" | "members" | "private" | null;
        };
      };
      public_member_profiles: {
        Row: {
          id: string | null;
          full_name: string | null;
          is_verified_artist: boolean | null;
          verified_artist_at: string | null;
          username: string | null;
          avatar_url: string | null;
          cover_url: string | null;
          gender: ProfileGender | null;
          bio: string | null;
          website: string | null;
          location: string | null;
          role: AppRole | null;
          creator_slug: string | null;
          headline: string | null;
          about: string | null;
          featured_quote: string | null;
          profile_visibility: "public" | "members" | "private" | null;
          message_permissions: "everyone" | "followers" | "nobody" | null;
          viewer_can_message: boolean | null;
          follower_count: number | null;
          following_count: number | null;
          subscriber_count: number | null;
          post_count: number | null;
        };
      };
      feed_posts: {
        Row: {
          id: string | null;
          author_id: string | null;
          post_type: FeedPostType | null;
          surface: PostSurface | null;
          title: string | null;
          body: string | null;
          media_url: string | null;
          thumbnail_url: string | null;
          media_duration_seconds: number | null;
          media_width: number | null;
          media_height: number | null;
          tip_enabled: boolean | null;
          share_count: number | null;
          tip_total_paise: number | null;
          is_published: boolean | null;
          is_pinned: boolean | null;
          created_at: string | null;
          full_name: string | null;
          is_verified_artist: boolean | null;
          username: string | null;
          avatar_url: string | null;
          creator_slug: string | null;
          headline: string | null;
          comment_permissions: "everyone" | "followers" | "nobody" | null;
          viewer_can_comment: boolean | null;
        };
      };
      short_posts: {
        Row: {
          id: string | null;
          author_id: string | null;
          post_type: FeedPostType | null;
          surface: PostSurface | null;
          title: string | null;
          body: string | null;
          media_url: string | null;
          thumbnail_url: string | null;
          media_duration_seconds: number | null;
          media_width: number | null;
          media_height: number | null;
          tip_enabled: boolean | null;
          share_count: number | null;
          tip_total_paise: number | null;
          is_published: boolean | null;
          is_pinned: boolean | null;
          created_at: string | null;
          full_name: string | null;
          is_verified_artist: boolean | null;
          username: string | null;
          avatar_url: string | null;
          creator_slug: string | null;
          headline: string | null;
          comment_permissions: "everyone" | "followers" | "nobody" | null;
          viewer_can_comment: boolean | null;
        };
      };
      active_stories: {
        Row: {
          id: string | null;
          author_id: string | null;
          media_kind: FeedPostType | null;
          media_url: string | null;
          media_storage_path: string | null;
          thumbnail_url: string | null;
          thumbnail_storage_path: string | null;
          body: string | null;
          media_duration_seconds: number | null;
          media_width: number | null;
          media_height: number | null;
          compression_status: string | null;
          expires_at: string | null;
          created_at: string | null;
          full_name: string | null;
          is_verified_artist: boolean | null;
          username: string | null;
          avatar_url: string | null;
          creator_slug: string | null;
          headline: string | null;
        };
      };
      post_engagement_stats: {
        Row: {
          post_id: string | null;
          like_count: number | null;
          comment_count: number | null;
          share_count: number | null;
          tip_total_paise: number | null;
        };
      };
      poll_option_results: {
        Row: {
          option_id: string | null;
          post_id: string | null;
          label: string | null;
          position: number | null;
          vote_count: number | null;
        };
      };
      comment_threads: {
        Row: {
          id: string | null;
          post_id: string | null;
          body: string | null;
          created_at: string | null;
          author_id: string | null;
          full_name: string | null;
          author_is_verified_artist: boolean | null;
          username: string | null;
          avatar_url: string | null;
        };
      };
      direct_thread_previews: {
        Row: {
          thread_id: string | null;
          peer_id: string | null;
          peer_full_name: string | null;
          peer_is_verified_artist: boolean | null;
          peer_username: string | null;
          peer_avatar_url: string | null;
          peer_role: AppRole | null;
          last_message_body: string | null;
          last_message_created_at: string | null;
          unread_count: number | null;
          message_count: number | null;
        };
      };
      direct_message_entries: {
        Row: {
          id: string | null;
          thread_id: string | null;
          sender_id: string | null;
          body: string | null;
          created_at: string | null;
          full_name: string | null;
          is_verified_artist: boolean | null;
          username: string | null;
          avatar_url: string | null;
        };
      };
      notification_items: {
        Row: {
          id: string | null;
          recipient_id: string | null;
          actor_id: string | null;
          type: NotificationType | null;
          title: string | null;
          body: string | null;
          link: string | null;
          is_read: boolean | null;
          created_at: string | null;
          actor_full_name: string | null;
          actor_is_verified_artist: boolean | null;
          actor_username: string | null;
          actor_avatar_url: string | null;
        };
      };
    };
    Functions: {
      convert_profile_to_creator: {
        Args: {
          desired_slug?: string | null;
        };
        Returns: {
          role: AppRole;
          creator_slug: string | null;
        }[];
      };
      open_direct_thread: {
        Args: {
          peer_id: string;
        };
        Returns: string;
      };
      mark_thread_read: {
        Args: {
          target_thread_id: string;
        };
        Returns: undefined;
      };
      mark_notification_read: {
        Args: {
          target_notification_id: string;
        };
        Returns: undefined;
      };
      mark_all_notifications_read: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      app_role: AppRole;
      feed_post_type: FeedPostType;
      notification_type: NotificationType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
