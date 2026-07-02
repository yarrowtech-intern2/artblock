# ArtBlock Backend Contract Checklist

Use this document when setting up the Expo mobile app in `code4x` or any other project that must connect to the same ArtBlock backend.

The goal is not just to reuse the same Supabase URL. The goal is to reuse the same backend contract:

- schema
- policies
- storage
- views
- RPCs
- Edge Functions
- realtime subscriptions
- data shapes

## Source of truth

These are the backend sources of truth in the current project:

- schema and policies: `code/supabase/migrations/*`
- edge functions: `code/supabase/functions/*`
- generated database types: `code/src/lib/supabase.types.ts`
- current client contract reference: `code/src/lib/profile.ts`
- admin-specific backend usage: `code/src/lib/admin.ts`

If the new mobile project uses the same backend, it should align to these sources, not invent parallel table shapes.

## Required top-level decision

The mobile app should point to the same Supabase project as the existing web app.

That means:

- same project URL
- same client-side key type
- same auth users
- same database
- same storage buckets
- same deployed edge functions

## Environment checklist

Minimum mobile environment values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or the client key currently used by the project

Backend function secrets that must already exist in the shared Supabase project:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Notes:

- The mobile app only needs the client-side key.
- The Edge Functions need the service-role and Razorpay secrets.
- For new work, prefer Supabase publishable client keys if your project has them available.

## Migration checklist

The new project must be compatible with the full migration history already used by the current backend.

Current migration set:

- `20260331_init_profiles.sql`
- `20260331_creator_profiles_and_storage.sql`
- `20260331_feed_posts.sql`
- `20260331_rich_feed_engagement.sql`
- `20260331_creator_profile_depth.sql`
- `20260331_profile_social_features.sql`
- `20260331_inbox_realtime_unread_state.sql`
- `20260331_notifications.sql`
- `20260331_saved_posts.sql`
- `20260624_creator_verification_and_payments.sql`
- `202606290001_fix_can_message_profile_defaults.sql`
- `202606290002_profile_cover_images.sql`
- `202606290003_profile_gender.sql`
- `20260629_user_settings_and_account_controls.sql`
- `20260630_admin_campaigns.sql`
- `20260630_shorts_reels_and_tips.sql`
- `20260701_notification_deep_links.sql`
- `20260701_stories.sql`
- `20260701_story_view_receipts.sql`
- `202607020001_community_notification_types.sql`
- `202607020002_artist_communities_phase2.sql`
- `202607020003_fix_community_role_enum_casts.sql`

Checklist:

- Do not create a second schema in `code4x`.
- Do not manually recreate tables with slightly different names.
- Treat this migration history as canonical.
- If `code4x` needs local backend work, it should use the same migration chain.

## Enum contract

These enums affect real application behavior and should be treated as backend-owned:

- `app_role`
  - current values include `visitor`, `creator`, `admin`
- `notification_type`
  - base values include `new_follower`, `new_subscriber`, `new_message`, `post_like`, `post_comment`
  - later additions include `community_invite`, `community_joined`
- `feed_post_type`
  - `image`, `video`, `poll`, `text`
- `post_surface`
  - `feed`, `short`
- `community_member_role`
  - `admin`, `moderator`, `member`
- `community_membership_status`
  - `invited`, `active`, `rejected`

Checklist:

- Mobile should not hardcode alternate spellings.
- Role-based UI should branch from these values.
- Generated DB types should be kept in sync with enum additions.

## Core table contract

These are the main tables the current app relies on directly or indirectly.

### Identity and profile

- `profiles`
- `creator_profiles`
- `user_settings`

### Social graph

- `profile_follows`
- `creator_subscriptions`

### Feed and content

- `posts`
- `post_poll_options`
- `post_poll_votes`
- `post_reactions`
- `post_comments`
- `post_bookmarks`
- `post_shares`

### Stories

- `stories`
- `story_views`

### Messaging

- `direct_threads`
- `direct_thread_members`
- `direct_messages`

### Communities

- `artist_communities`
- `community_memberships`
- `community_messages`
- `community_message_reactions`

### Notifications and payments

- `notifications`
- `artist_verification_payments`
- `artist_tips`

### Admin

- `campaigns`

Checklist:

- Mobile writes should target these same tables or approved RPCs/Edge Functions.
- Do not duplicate content tables for mobile-only content.
- Use the same field semantics, especially around `posts.surface`, `posts.tip_enabled`, and notification links.

## View contract

The current app depends heavily on views. These are part of the backend contract.

### Public profile and creator discovery

- `public_creator_profiles`
- `public_member_profiles`

### Feed and content read models

- `feed_posts`
- `short_posts`
- `post_engagement_stats`
- `poll_option_results`
- `comment_threads`
- `active_stories`

### Messaging and communities

- `direct_thread_previews`
- `direct_message_entries`
- `community_access_profiles`
- `community_previews`
- `community_member_directory`
- `community_message_entries`

### Notifications

- `notification_items`

Checklist:

- Mobile should read from the same views where possible.
- If a mobile feature needs the same content list, prefer the same view instead of rebuilding joins in the app.
- If the view shape changes, regenerate DB types for both web and mobile.

## RPC function contract

The current client uses these database RPCs and the mobile app should treat them as part of the supported backend surface.

### Profile and creator conversion

- `convert_profile_to_creator`

### Direct messaging

- `open_direct_thread`
- `mark_thread_read`

### Communities

- `create_artist_community`
- `update_artist_community`
- `invite_community_members`
- `join_artist_community`
- `respond_to_community_invite`
- `set_community_member_role`
- `remove_community_member`
- `leave_artist_community`
- `mark_community_read`

### Notifications

- `mark_notification_read`
- `mark_all_notifications_read`

Checklist:

- Reuse these RPCs instead of replacing them with ad hoc client-side sequences.
- Keep request argument names the same.
- Treat return payload shapes as part of the contract.

## Edge Function contract

These deployed Supabase Edge Functions are part of the backend surface and should be reused by mobile.

- `create-artist-verification-order`
- `verify-artist-verification-payment`
- `create-artist-tip-order`
- `verify-artist-tip-payment`
- `manage-account-lifecycle`

What they do:

- create and verify Razorpay artist verification payments
- create and verify Razorpay tipping payments
- deactivate or delete accounts

Checklist:

- Mobile should call the same function names.
- Do not move payment verification into the client.
- Use authenticated requests with the current user session.
- Keep function secrets configured in the shared Supabase project.

## Storage contract

Current storage buckets:

- `avatars`
- `post-media`
- `campaign-media`

Current usage:

- profile avatar uploads go to `avatars`
- profile cover uploads also go to `avatars`
- feed post uploads go to `post-media`
- shorts uploads go to `post-media`
- story uploads also go to `post-media`
- admin campaign assets go to `campaign-media`

Current path convention:

- profile images: `{userId}/avatar-{timestamp}.{ext}` or `{userId}/cover-{timestamp}.{ext}`
- post media: `{userId}/post-{timestamp}.{ext}`
- story media: `{userId}/story-{timestamp}.{ext}`

Checklist:

- Mobile should use the same bucket names.
- Prefer the same path conventions unless there is a deliberate migration.
- If a new path pattern is introduced, confirm storage policies still allow it.
- Media cleanup logic should assume the stored `media_storage_path` and `thumbnail_storage_path` remain valid.

## RLS and permission expectations

This backend relies heavily on RLS, not just frontend checks.

Important examples already implemented:

- users can only update their own profile
- users can only update their own settings
- feed posts are owner-managed plus admin exceptions
- messages are limited to thread members or eligible community members
- bookmarks, reactions, votes, and shares are user-scoped
- stories are visibility-gated
- community actions depend on role and membership status

Checklist:

- Mobile code should assume the server is authoritative.
- Do not bypass role checks in the client by exposing admin-only write paths.
- When a request fails, surface the RLS/policy error clearly during development.

## Realtime contract

Current realtime dependencies in messaging are based on `postgres_changes` subscriptions to:

- `direct_thread_members`
- `community_memberships`
- `direct_messages`
- `community_messages`

Checklist:

- If mobile implements live inbox/chat updates, subscribe to the same tables.
- Keep unread-state logic compatible with the existing read-marking RPCs.
- Do not create a second unread-tracking mechanism in the client.

## Notification contract

Notifications are not just rows in `notifications`. The app reads the shaped view:

- `notification_items`

Important fields include:

- `type`
- `title`
- `body`
- `link`
- `is_read`
- actor profile details

Checklist:

- Mobile should read from `notification_items`, not raw `notifications`, for UI rendering.
- Mobile deep linking should honor the `link` field already being produced by the backend.
- Notification read state should use:
  - `mark_notification_read`
  - `mark_all_notifications_read`

## Current client operations that define the contract

The current web app uses the backend for these core operations. The mobile app should match these, not redesign them casually.

### Auth and profile

- session-based Supabase auth
- read own profile
- update own profile
- read and update user settings
- convert profile to creator

### Feed

- fetch feed from `feed_posts`
- create posts in `posts`
- create poll options in `post_poll_options`
- add reactions, comments, votes, bookmarks, shares

### Shorts

- fetch reels from `short_posts`
- tip creators via Edge Functions
- share reels through internal messaging and share records

### Stories

- create story rows in `stories`
- track views in `story_views`
- read grouped story feed from `active_stories`

### Messaging

- open direct thread via RPC
- write direct messages to `direct_messages`
- read thread previews from `direct_thread_previews`
- read thread bodies from `direct_message_entries`
- read community previews and messages from their views

### Communities

- community creation and management via RPC
- direct writes to `community_messages`
- direct writes/deletes to `community_message_reactions`

### Notifications

- fetch from `notification_items`
- mark single/all read via RPC

## Data type synchronization checklist

The new project should keep typed database bindings in sync with the shared schema.

Recommended rule:

- whenever migrations change schema, views, enums, or RPC signatures, regenerate and update the DB types used by mobile

At minimum, the mobile project should have equivalents for:

- database types
- app-level domain mappers
- enum-aware UI branching

Current type reference:

- `code/src/lib/supabase.types.ts`

## What should not diverge in `code4x`

Do not change these casually in the mobile project:

- table names
- view names
- bucket names
- edge function names
- enum values
- notification link semantics
- message-read semantics
- community membership state names
- post surface names

If any of these must change, the backend contract should be updated once and both web and mobile should move together.

## Recommended setup workflow for `code4x`

1. Point the Expo app at the same Supabase project.
2. Recreate the DB client using the shared schema contract.
3. Port only the backend-facing service layer first.
4. Verify reads from these views:
   - `public_member_profiles`
   - `feed_posts`
   - `short_posts`
   - `direct_thread_previews`
   - `notification_items`
5. Verify writes against:
   - `posts`
   - `post_comments`
   - `post_reactions`
   - `post_bookmarks`
   - `direct_messages`
6. Verify RPCs:
   - `open_direct_thread`
   - `mark_thread_read`
   - `mark_notification_read`
7. Verify Edge Functions:
   - artist verification flow
   - tipping flow
   - account lifecycle flow
8. Add realtime subscriptions for chat only after basic reads/writes are stable.

## Quick validation checklist

- Same Supabase project URL is configured
- Same client key family is configured
- Same migrations are considered canonical
- Same enums are reflected in mobile types
- Same views are used for feed, inbox, notifications, and stories
- Same RPCs are used for thread/community/notification workflows
- Same Edge Functions are used for payments and account lifecycle
- Same storage buckets and path conventions are used
- Same realtime tables are used for chat updates
- DB types are regenerated after backend changes

## Short conclusion

To reuse the same backend successfully, `code4x` needs the same:

- Supabase project
- schema
- policies
- storage buckets
- views
- RPCs
- Edge Functions
- typed contracts

Using the same URL alone is not enough.
