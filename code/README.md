# ArtBlock

Production-oriented starter for a mobile-first creator platform using React, TypeScript, Supabase, and PostgreSQL.

## Included

- Responsive landing page with header, hero, about, CTA, and footer
- Login and signup flows wired to Supabase email/password auth
- Two roles: `visitor` and `creator`
- Protected feed and dashboard routes for authenticated users
- PostgreSQL schema and Supabase RLS policies for the `profiles` table
- Editable account profile fields, avatar uploads, and creator publishing flow
- Mixed creator feed with image, video, poll, and formatted text posts
- Visitor interactions with likes, comments, and poll voting
- Public creator pages at `/creators/:slug`
- Artist account conversion and Razorpay-backed creator verification
- Admin console with campaign poster management, user blocking, and post moderation
- Feed campaign posters on desktop rail and inline mobile/feed placements

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set:

   ```bash
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

3. Apply these SQL files in order inside your Supabase SQL editor or migration workflow:

   - [supabase/migrations/20260331_init_profiles.sql](/e:/s15/Projects/artblock-final/code/supabase/migrations/20260331_init_profiles.sql)
   - [supabase/migrations/20260331_creator_profiles_and_storage.sql](/e:/s15/Projects/artblock-final/code/supabase/migrations/20260331_creator_profiles_and_storage.sql)
   - [supabase/migrations/20260331_feed_posts.sql](/e:/s15/Projects/artblock-final/code/supabase/migrations/20260331_feed_posts.sql)
   - [supabase/migrations/20260331_rich_feed_engagement.sql](/e:/s15/Projects/artblock-final/code/supabase/migrations/20260331_rich_feed_engagement.sql)
   - [supabase/migrations/20260624_creator_verification_and_payments.sql](/e:/s15/Projects/artblock-final/code/supabase/migrations/20260624_creator_verification_and_payments.sql)
   - [supabase/migrations/20260629_user_settings_and_account_controls.sql](/e:/s15/Projects/artblock-final/code/supabase/migrations/20260629_user_settings_and_account_controls.sql)
   - [supabase/migrations/20260630_admin_campaigns.sql](/e:/s15/Projects/artblock-final/code/supabase/migrations/20260630_admin_campaigns.sql)

4. Deploy the Supabase Edge Functions and set these function secrets:

   ```bash
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   RAZORPAY_KEY_ID=...
   RAZORPAY_KEY_SECRET=...
   ```

   Functions added in this repo:

   - `create-artist-verification-order`
   - `manage-account-lifecycle`
   - `verify-artist-verification-payment`

5. Start the app:

   ```bash
   npm run dev
   ```

## First admin account

After the new migration is applied, create the first admin with:

```bash
SUPABASE_SERVICE_ROLE_KEY=... npm run admin:create
```

Default bootstrap credentials used by the script:

- Email: `admin@gmail.com`
- Password: `12345678`

Override them if needed with:

```bash
ADMIN_BOOTSTRAP_EMAIL=...
ADMIN_BOOTSTRAP_PASSWORD=...
ADMIN_BOOTSTRAP_NAME=...
SUPABASE_SERVICE_ROLE_KEY=...
npm run admin:create
```

## Recommended next modules

- Payments and event processing
- Follows, creator discovery, and notifications
