# ArtBlock Web Create/Publish Handoff

This is the exact web-side handoff for the create and publish flow, based on the current repo.

## Send these files first

These are the primary files the other agent asked for.

- `code/src/views/CreatePage.tsx`
- `code/src/components/create/CreateOptionsMenu.tsx`
- `code/src/components/dashboard/PostComposer.tsx`
- `code/src/components/shorts/ShortsComposerForm.tsx`
- `code/src/components/stories/StoryComposer.tsx`
- `code/src/lib/profile.ts`
- `code/src/lib/postRichContent.ts`
- `code/src/lib/createOptions.ts`
- `code/src/lib/mediaProcessing.ts`
- `code/src/lib/supabase.types.ts`
- `code/supabase/migrations/20260630_shorts_reels_and_tips.sql`
- `code/supabase/migrations/20260701_stories.sql`

If they only want the minimal first batch, send this subset first:

- `code/src/views/CreatePage.tsx`
- `code/src/components/create/CreateOptionsMenu.tsx`
- `code/src/components/dashboard/PostComposer.tsx`
- `code/src/lib/profile.ts`
- `code/src/lib/postRichContent.ts`
- `code/src/components/shorts/ShortsComposerForm.tsx`
- `code/src/components/stories/StoryComposer.tsx`

## What each file covers

### UI entry point

- `code/src/views/CreatePage.tsx`
  - The unified Publish page.
  - Chooses the active create surface from `?type=...`.
  - Routes feed types to `PostComposer`.
  - Routes `short` to `ShortsComposerForm`.
  - Routes `story` to `StoryComposer`.

### Type chips

- `code/src/lib/createOptions.ts`
  - Source of truth for the type chips:
    - `Image`
    - `Video`
    - `Polls`
    - `Text`
    - `Shorts`
    - `Story`
  - Also defines the route mapping to `/create?type=...`.

- `code/src/components/create/CreateOptionsMenu.tsx`
  - Renders the chip/menu UI from `createOptions`.

### Feed post composer

- `code/src/components/dashboard/PostComposer.tsx`
  - Feed publish UI for `image`, `video`, `poll`, and `text`.
  - Media upload card UI for image/video posts.
  - Rich text / text-post composer UI.
  - Poll option UI.
  - Validation rules.
  - Submit handler for feed publish.
  - Builds the rich-post payload via `serializeRichPostPayload(...)`.

### Shorts composer

- `code/src/components/shorts/ShortsComposerForm.tsx`
  - Shorts/Reels create UI.
  - Compact media upload card UI.
  - Tip toggle.
  - Upload + publish sequence for `surface: "short"`.

### Story composer

- `code/src/components/stories/StoryComposer.tsx`
  - Story create UI.
  - Compact media upload card UI.
  - Upload + publish sequence for `stories`.

### Publish logic and Supabase contract

- `code/src/lib/profile.ts`
  - `uploadPostMedia(...)`
  - `uploadStoryMedia(...)`
  - `createFeedPost(...)`
  - `createStory(...)`
  - `markStoryViewed(...)`
  - also contains feed/short/story read-model calls against:
    - `feed_posts`
    - `short_posts`
    - `active_stories`

### Rich-post payload contract

- `code/src/lib/postRichContent.ts`
  - Defines the `__artblock_rich_post__:` marker.
  - Defines `RichPostPayload`.
  - Defines `RichPostStyle`.
  - Serializes and parses the payload.

### Browser-side media preprocessing

- `code/src/lib/mediaProcessing.ts`
  - Image compression.
  - Video compression.
  - Video thumbnail generation.
  - Shared by shorts and stories today.

### Backend shape references

- `code/src/lib/supabase.types.ts`
  - TS contract for tables, views, and enums used by the web client.

- `code/supabase/migrations/20260630_shorts_reels_and_tips.sql`
  - Adds shorts/reels fields to `posts`.
  - Defines `short_posts`.
  - Defines `post-media` bucket config for this flow.

- `code/supabase/migrations/20260701_stories.sql`
  - Defines `stories`.
  - Defines `story_views`.
  - Defines `active_stories`.

## Exact implementation points

Use these when the other agent wants line-accurate pointers.

- `code/src/views/CreatePage.tsx:12`
  - Unified Publish page entry.
- `code/src/views/CreatePage.tsx:48`
  - Feed composer branch.
- `code/src/views/CreatePage.tsx:60`
  - Shorts branch.
- `code/src/views/CreatePage.tsx:66`
  - Story branch.

- `code/src/lib/createOptions.ts:16`
  - Type chip definitions.

- `code/src/components/dashboard/PostComposer.tsx:160`
  - Feed post submit handler.
- `code/src/components/dashboard/PostComposer.tsx:339`
  - Image/video media upload card UI.
- `code/src/components/dashboard/PostComposer.tsx:424`
  - Poll options UI.
- `code/src/components/dashboard/PostComposer.tsx:454`
  - Text/poll composer textarea UI.
- `code/src/components/dashboard/PostComposer.tsx:524`
  - Rich style controls.
- `code/src/components/dashboard/PostComposer.tsx:712`
  - Rich preview renderer.

- `code/src/components/shorts/ShortsComposerForm.tsx:49`
  - Shorts media preparation handler.
- `code/src/components/shorts/ShortsComposerForm.tsx:87`
  - Shorts publish handler.
- `code/src/components/shorts/ShortsComposerForm.tsx:172`
  - Shorts upload card UI.

- `code/src/components/stories/StoryComposer.tsx:43`
  - Story media preparation handler.
- `code/src/components/stories/StoryComposer.tsx:81`
  - Story publish handler.
- `code/src/components/stories/StoryComposer.tsx:150`
  - Story upload card UI.

- `code/src/lib/postRichContent.ts:19`
  - `RichPostPayload` type.
- `code/src/lib/postRichContent.ts:40`
  - `__artblock_rich_post__:` marker.
- `code/src/lib/postRichContent.ts:42`
  - Serializer.
- `code/src/lib/postRichContent.ts:45`
  - Parser.

- `code/src/lib/profile.ts:1749`
  - Shared storage upload helper.
- `code/src/lib/profile.ts:1773`
  - `uploadPostMedia(...)`.
- `code/src/lib/profile.ts:1776`
  - `uploadStoryMedia(...)`.
- `code/src/lib/profile.ts:1798`
  - Story create input type.
- `code/src/lib/profile.ts:1893`
  - `createFeedPost(...)`.
- `code/src/lib/profile.ts:1957`
  - `post_poll_options` insert.
- `code/src/lib/profile.ts:1971`
  - `createStory(...)`.
- `code/src/lib/profile.ts:2004`
  - `markStoryViewed(...)`.
- `code/src/lib/profile.ts:2570`
  - `short_posts` reads.
- `code/src/lib/profile.ts:2629`
  - `active_stories` reads.

## Publish behavior by surface

### Feed posts

Source:

- `code/src/components/dashboard/PostComposer.tsx`
- `code/src/lib/profile.ts`

Behavior:

- `image` and `video` require a selected file.
- `poll` requires a non-empty question and at least 2 options.
- `text` requires non-empty body.
- The composer always serializes the body as rich-post payload before insert.
- For image/video, `plainBody` is also sent so `caption` can be stored as plain text.
- Feed inserts go to `posts` with `surface = 'feed'`.
- Poll options insert separately into `post_poll_options` after the post insert.

### Shorts/Reels

Source:

- `code/src/components/shorts/ShortsComposerForm.tsx`
- `code/src/lib/mediaProcessing.ts`
- `code/src/lib/profile.ts`

Behavior:

- Accepts image or video.
- Preprocesses media with `prepareShortMedia(...)`.
- Uploads primary media to storage.
- Uploads generated thumbnail if present.
- Inserts into `posts` with:
  - `surface = 'short'`
  - `post_type = preparedMedia.kind`
  - `tip_enabled = tipEnabled`
  - width, height, duration, compression status, storage paths, thumbnail URL/path

### Stories

Source:

- `code/src/components/stories/StoryComposer.tsx`
- `code/src/lib/mediaProcessing.ts`
- `code/src/lib/profile.ts`

Behavior:

- Accepts image or video.
- Preprocesses media with `prepareShortMedia(...)`.
- Uploads primary media to storage.
- Uploads generated thumbnail if present.
- Inserts into `stories`.
- Story expiry defaults to 24 hours on the DB side.

## Backend contract the mobile side must match

### Enums

From `code/src/lib/supabase.types.ts`:

- `FeedPostType = "image" | "video" | "poll" | "text"`
- `PostSurface = "feed" | "short"`
- `StoryMediaKind = "image" | "video"`

### Tables written by the create flow

- `posts`
- `post_poll_options`
- `stories`
- `story_views` only for view tracking, not initial publish

### Views read by the web side

- `feed_posts`
- `short_posts`
- `active_stories`

### Supabase writes used by publish

Feed publish:

- insert into `posts`
- optional insert into `post_poll_options`

Short publish:

- storage upload to `post-media`
- insert into `posts`

Story publish:

- storage upload to `post-media`
- insert into `stories`

Story view receipt:

- upsert into `story_views`

### RPCs and Edge Functions used by publish

For create/publish itself in the current web flow:

- no RPC is used for post/short/story creation
- no Edge Function is used for post/short/story creation

Tipping exists elsewhere in the app, but not in the publish submit path itself.

## Rich-post payload contract

Source:

- `code/src/lib/postRichContent.ts`
- builder call in `code/src/components/dashboard/PostComposer.tsx:211`

Marker prefix:

- `__artblock_rich_post__:`

Shape:

```ts
type RichPostPayload = {
  version: 1;
  title: string | null;
  body: string | null;
  style: {
    titleColor: string;
    bodyColor: string;
    titleSize: number;
    bodySize: number;
    titleWeight: 700 | 800 | 900;
    bodyWeight: 400 | 500 | 600 | 700;
    titleFont: "space" | "onest" | "poppins";
    textAlign: "left" | "center" | "right";
    backgroundMode: "none" | "solid" | "gradient";
    backgroundColor: string;
    backgroundColorSecondary: string;
  };
};
```

Current default style:

- `titleColor = "#111111"`
- `bodyColor = "#2e2e2b"`
- `titleSize = 28`
- `bodySize = 16`
- `titleWeight = 800`
- `bodyWeight = 500`
- `titleFont = "onest"`
- `textAlign = "left"`
- `backgroundMode = "none"`
- `backgroundColor = "#fff3c4"`
- `backgroundColorSecondary = "#f59e0b"`

Important detail:

- Even non-text feed posts currently serialize `body` through the rich-post payload helper.
- The plain caption fallback for media posts is carried separately via `plainBody`, which becomes `caption` in `posts`.

## Validation rules in the web app

From `code/src/components/dashboard/PostComposer.tsx`:

- title max length: 120
- body max length: 2000
- image file required for image posts
- video file required for video posts
- image max upload size in composer: 5 MB
- video max upload size in composer: 25 MB
- poll requires question
- poll requires at least 2 non-empty options
- poll UI allows up to 4 options
- text post requires body

From `code/src/components/shorts/ShortsComposerForm.tsx`:

- media required
- title max length: 100
- caption max length: 500
- tip toggle defaults to `true`

From `code/src/components/stories/StoryComposer.tsx`:

- media required
- caption max length: 240

## Storage contract

### Bucket

Current create flow bucket:

- `post-media`

Source:

- `code/src/lib/profile.ts:1773`
- `code/src/lib/profile.ts:1776`
- `code/supabase/migrations/20260630_shorts_reels_and_tips.sql:221`

### Upload path rules

Source:

- `code/src/lib/profile.ts:1749`

Path format:

- post uploads: `{userId}/post-{timestamp}.{ext}`
- story uploads: `{userId}/story-{timestamp}.{ext}`

Notes:

- shorts use `uploadPostMedia(...)`, so shorts also use the `post-` path prefix
- story thumbnails also use the `story-` path prefix
- uploads are `upsert: true`

### Thumbnail generation

Source:

- `code/src/lib/mediaProcessing.ts:151`

Behavior:

- image uploads do not generate thumbnails
- video uploads generate a JPEG thumbnail from an early frame
- shorts and stories both upload the generated thumbnail when present

### Browser-side preprocessing limits

Source:

- `code/src/lib/mediaProcessing.ts`

Rules:

- images larger than 4 MB or larger than 1600px bounds may be recompressed
- videos larger than 18 MB or larger than 720x1280 bounds may be recompressed
- compressed video output prefers WebM via `MediaRecorder` when supported
- if browser compression is unsupported, the original video may still be used

### Bucket-level allowed mime types and size limit

From `code/supabase/migrations/20260630_shorts_reels_and_tips.sql:221`:

- bucket size limit: `104857600` bytes
- allowed mime types:
  - `image/png`
  - `image/jpeg`
  - `image/webp`
  - `video/mp4`
  - `video/webm`
  - `video/quicktime`

Important distinction:

- UI-level validation is stricter than bucket-level limits.
- Example: feed composer blocks image uploads above 5 MB and video uploads above 25 MB, even though storage allows much larger files.

## Existing docs that help

Already in this repo:

- `Docs/expo-mobile-handoff.md`
- `Docs/backend-contract-checklist.md`

These are useful background docs, but they are broader than the exact create/publish flow. The files listed earlier are the real source of truth for matching behavior.

## Short answer for the other agent

If you want a compact reply to send immediately, use this:

```text
Send these exact web files first:

- code/src/views/CreatePage.tsx
- code/src/components/create/CreateOptionsMenu.tsx
- code/src/components/dashboard/PostComposer.tsx
- code/src/components/shorts/ShortsComposerForm.tsx
- code/src/components/stories/StoryComposer.tsx
- code/src/lib/profile.ts
- code/src/lib/postRichContent.ts
- code/src/lib/createOptions.ts
- code/src/lib/mediaProcessing.ts
- code/src/lib/supabase.types.ts
- code/supabase/migrations/20260630_shorts_reels_and_tips.sql
- code/supabase/migrations/20260701_stories.sql

Why:
- CreatePage.tsx is the unified Publish screen.
- PostComposer.tsx is the feed post UI + validation + submit flow for image/video/poll/text.
- ShortsComposerForm.tsx is the reels/shorts UI + publish flow.
- StoryComposer.tsx is the story UI + publish flow.
- profile.ts contains the exact Supabase inserts/uploads for posts, poll options, shorts, stories, and story views.
- postRichContent.ts defines the __artblock_rich_post__ payload contract.
- createOptions.ts defines the type chips and route mapping.
- mediaProcessing.ts defines browser-side compression and thumbnail generation.
- supabase.types.ts and the two migrations define the table/view/storage contract for posts, post_poll_options, short_posts, stories, and active_stories.
```
