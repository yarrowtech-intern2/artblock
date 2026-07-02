# ArtBlock Expo Mobile App Handoff

This document is meant to be copied into the new `code4x` project folder so work can continue without losing product or technical context.

## Goal

Build a dedicated mobile app for the existing ArtBlock system using Expo React Native, while keeping the current web app as a separate product surface.

The mobile app should connect to the same Supabase backend, reuse the same data model and business rules where possible, and prioritize the mobile-native experiences:

- feed
- shorts / reels
- messages
- notifications
- profile
- creator upload flows

## Current system summary

The existing system already exists in a separate web app repo/folder:

- web frontend: React + TypeScript + Vite
- backend: Supabase
- auth: Supabase Auth
- database: Postgres via Supabase
- storage: Supabase Storage
- server logic: Supabase Edge Functions
- payments: Razorpay

The current web app is mobile-first in layout, but it is still a browser app, not a native mobile app.

## Existing repo structure

Current source layout:

```text
artblock-final/
  Docs/
  code/        # current React/Vite web app
```

Important paths in the current web app:

- `code/src/lib/supabase.ts`
- `code/src/providers/AuthProvider.tsx`
- `code/src/lib/profile.ts`
- `code/src/views/FeedPage.tsx`
- `code/src/views/ShortsPage.tsx`
- `code/src/views/MessagesPage.tsx`
- `code/src/components/dashboard/PostComposer.tsx`
- `code/src/components/shorts/ShortsComposerForm.tsx`
- `code/src/components/stories/StoryComposer.tsx`
- `code/src/lib/mediaProcessing.ts`
- `code/supabase/migrations/*`
- `code/supabase/functions/*`

## Recommendation

Do not port the current Vite app directly into React Native.

Build a separate Expo app that uses the same Supabase project, but reimplements the UI natively.

Recommended folder layout:

```text
artblock-final/
  Docs/
  code/        # existing web app
  mobile/      # new Expo React Native app
```

If work is happening in a separate project folder called `code4x`, this document should be copied there and treated as the project brief.

## Why a separate Expo app is needed

The current web client contains browser-specific code that should not be copied as-is into React Native:

- browser session storage for Supabase auth
- file input and `capture=` camera flows
- `navigator.share`
- DOM-based `IntersectionObserver`
- `document.createElement("canvas")`
- `MediaRecorder`-based video compression
- browser Razorpay checkout integration

Because of that, the backend can be reused, but the client UI and some client utilities need native replacements.

## Core product areas already supported by backend

The current backend already supports much of the product logic needed by mobile:

- auth and profiles
- creator profiles
- feed posts
- poll posts
- comments
- likes / reactions
- bookmarks / saved posts
- shares
- stories
- shorts / reels
- direct messages
- creator communities
- notifications
- creator verification
- artist tipping
- admin tooling

This means the mobile project should focus first on client architecture and native UX, not rebuilding backend fundamentals.

## Current frontend architecture to understand before rebuilding

### Auth

The web app initializes Supabase in:

- `code/src/lib/supabase.ts`

The auth/session state is managed in:

- `code/src/providers/AuthProvider.tsx`

In the Expo app, this should be replaced with a React Native-compatible Supabase setup using persistent native storage.

### Data access

A very large amount of product logic currently lives in:

- `code/src/lib/profile.ts`

This file performs:

- direct table reads and writes
- storage uploads
- edge function calls
- data shaping and mapping
- feed, shorts, stories, messages, notifications, and profile operations

This file is the main source of system behavior context and should be reviewed carefully while designing the mobile data layer.

### Screens already implemented on web

Main screens that can be used as product references:

- feed: `code/src/views/FeedPage.tsx`
- messages: `code/src/views/MessagesPage.tsx`
- shorts: `code/src/views/ShortsPage.tsx`
- profile: `code/src/views/PublicProfilePage.tsx`
- dashboard / creator studio: `code/src/views/DashboardPage.tsx`
- notifications: `code/src/views/NotificationsPage.tsx`
- settings: `code/src/views/SettingsPage.tsx`

## Mobile architecture recommendation

Use this stack:

- Expo
- TypeScript
- Expo Router
- `@supabase/supabase-js`
- React Native AsyncStorage or the current recommended RN auth persistence approach for Supabase
- TanStack Query for server state
- Expo Notifications
- Expo Image / media picker stack
- native Razorpay integration for mobile payments

## Important implementation rule

Treat the current web app as:

- product behavior reference
- backend contract reference
- copy source for business rules

Do not treat it as:

- reusable UI code
- reusable browser utilities
- reusable media pipeline

## Backend reuse strategy

The new mobile app should reuse:

- the same Supabase project
- the same database schema
- the same RLS rules
- the same storage buckets
- the same edge functions

But some logic should be moved out of the web client over time.

### Preferred direction

Where current behavior is implemented through many direct Supabase table calls inside `code/src/lib/profile.ts`, consider consolidating the heavier workflows into:

- Supabase RPCs
- Supabase Edge Functions

Reason:

- web and mobile can share a stable backend contract
- less duplicated client logic
- easier long-term maintenance
- safer changes to permissions and workflows

## Features that need native replacement

### Media upload

Web currently uses browser file input and browser media preprocessing.

Native app should use:

- Expo Image Picker or Camera
- native-compatible compression pipeline
- native upload progress handling

### Share flows

Web uses browser share support.

Native app should use:

- native share sheet
- internal share into direct messages or communities

### Payments

Web uses browser Razorpay checkout.

Native app should use:

- Razorpay React Native SDK or the officially supported native mobile integration path

### Notifications

Native app should add:

- push notification token registration
- notification deep linking into feed, messages, or profile screens

## Proposed v1 mobile scope

Start with these screens and flows:

1. splash / boot
2. auth
3. main tab shell
4. feed
5. shorts
6. messages
7. notifications
8. profile
9. simple creator upload

Leave these for later if needed:

- full admin tools
- every dashboard control from web
- advanced creator management
- every web-only visual effect

## Suggested navigation

Recommended primary tabs:

- Feed
- Shorts
- Create
- Messages
- Profile

Secondary stack screens:

- Login
- Signup
- Public Profile
- Post Detail
- Comments
- Community Chat
- Direct Thread
- Notifications
- Settings
- Tip Payment
- Creator Verification

## Delivery phases

### Phase 1

Project bootstrap:

- create Expo app
- set up TypeScript
- configure Expo Router
- configure Supabase client
- configure auth persistence
- create environment setup

### Phase 2

Foundational app shell:

- auth provider
- session restore
- protected routes
- tab navigation
- loading and error states

### Phase 3

Core read-only product:

- feed list
- shorts list
- message inbox
- notification list
- public and own profile

### Phase 4

Core write actions:

- like
- comment
- bookmark
- follow / subscribe
- direct message
- community message

### Phase 5

Creator flows:

- upload post
- upload short
- upload story
- creator profile editing

### Phase 6

Native mobile polish:

- push notifications
- deep links
- share sheet
- native payments
- offline handling

## Known technical caution points

### 1. The current web data layer is very large

`code/src/lib/profile.ts` contains a lot of responsibilities. Do not blindly duplicate that file into the Expo app.

Instead:

- split logic into domain services
- keep raw Supabase access isolated
- centralize mapping and validation

### 2. Web and mobile should share behavior, not implementation

Copying business rules is acceptable.
Copying browser code is not.

### 3. Payments should be treated as a separate integration track

Razorpay on mobile should be implemented after core auth, feed, and messaging are stable.

### 4. Push notifications need backend coordination

The database already has notification-related work in migrations, but mobile push delivery will still need:

- token storage
- token refresh handling
- server-side sending path
- deep-link target mapping

## Environment expectations

The Expo app will need its own `.env` setup.

At minimum:

- Supabase URL
- Supabase publishable client key

Note:

- prefer current Supabase publishable keys for the new mobile app
- avoid extending legacy key usage if newer project keys are available

## Immediate next step for the new project

When starting `code4x`, the first concrete task should be:

1. scaffold Expo app
2. connect to the existing Supabase project
3. implement auth and protected routing
4. load real feed data from the current backend

That gives the fastest proof that the mobile app is connected to the real system rather than becoming a disconnected prototype.

## Starter brief for the next agent or project

Use this prompt in the new project if needed:

```text
Build an Expo React Native mobile app for the existing ArtBlock platform.

Constraints:
- Reuse the same Supabase backend used by the current web app.
- Do not port the current Vite UI directly.
- Rebuild the client natively for mobile.
- Treat the old web app as the source of backend behavior and product logic.
- Prioritize auth, feed, shorts, messages, notifications, profile, and creator uploads.

Important context:
- Current web app stack: React + TypeScript + Vite + Supabase + Razorpay.
- The main data logic currently lives in a large web-side service file: `code/src/lib/profile.ts`.
- Browser-only code exists for auth storage, file capture, media compression, share flows, and Razorpay checkout.
- The new app should use Expo, Expo Router, Supabase, native auth persistence, and a clean domain service structure.

First implementation target:
- bootstrap Expo app
- configure Supabase auth
- implement protected routing
- show live feed data from the real backend
```

## Current decision summary

Final architectural decision:

- keep web app in its current project
- build mobile app as a separate Expo project folder
- reuse Supabase backend
- rebuild UI natively
- gradually move reusable business logic behind cleaner backend contracts where necessary
