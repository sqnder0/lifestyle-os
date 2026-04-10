# Supabase Setup and Google OAuth Guide

## Overview

This guide explains how to set up Supabase for this app, wire authentication, and implement Google OAuth with calendar read scope.

Key implementation files in this repo:

- [src/lib/supabase.js](src/lib/supabase.js)
- [src/hooks/useSupabaseAuth.js](src/hooks/useSupabaseAuth.js)
- [src/App.jsx](src/App.jsx)
- [src/hooks/usePostgresSync.js](src/hooks/usePostgresSync.js)
- [src/components/modules/AuthScreen.jsx](src/components/modules/AuthScreen.jsx)
- [.env.example](.env.example)

---

## 1. Prerequisites

1. Create a Supabase project.
2. Create a Google Cloud project.
3. Ensure local frontend URL is available (for example `http://localhost:5173`).
4. Install dependencies:

```bash
npm install
```

---

## 2. Supabase Project Setup

1. Open Supabase Dashboard.
2. Go to Authentication -> Providers -> Google.
3. Enable the Google provider.
4. Paste Google OAuth Client ID and Client Secret (created in Google Cloud).
5. Go to Authentication -> URL Configuration.
6. Set:

- Site URL: `http://localhost:5173`
- Additional Redirect URLs: include local and production app URLs.

---

## 3. Google Cloud OAuth Setup

1. Open Google Cloud Console.
2. Go to APIs & Services -> Credentials.
3. Create OAuth 2.0 Client ID (Web application).
4. Add Authorized redirect URI:

```text
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
```

5. Add Authorized JavaScript origins:

- `http://localhost:5173`
- your production app origin

6. Copy Client ID and Client Secret into Supabase Google provider settings.

---

## 4. Environment Variables

Create or update local `.env` using values from [.env.example](.env.example).

Required frontend variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Also keep your existing API variables if you still run the backend:

- `VITE_API_URL`
- `API_PORT`
- `DATABASE_URL`
- etc.

After changing env values, restart the dev server.

---

## 5. Supabase Client Wiring

Supabase client lives in [src/lib/supabase.js](src/lib/supabase.js).

Current setup enables:

- persisted sessions
- auto refresh token
- URL session detection after OAuth redirect

If environment variables are missing, the file logs a warning.

---

## 6. Auth Hook Implementation

Auth flow is implemented in [src/hooks/useSupabaseAuth.js](src/hooks/useSupabaseAuth.js).

What it does:

1. Calls `supabase.auth.getSession()` on startup.
2. Subscribes to `onAuthStateChange`.
3. Maintains `session`, `user`, `profile`, `loading`, `profileLoading`.
4. Ensures a `profiles` row exists for authenticated users.
5. Supports:

- `signIn` (email/password)
- `signUp` (email/password)
- `signInWithGoogle`
- `signOut`
- `completeOnboarding`

---

## 7. Google OAuth Implementation Details

Google OAuth call is in `signInWithGoogle` inside [src/hooks/useSupabaseAuth.js](src/hooks/useSupabaseAuth.js):

- provider: `google`
- redirectTo: `${window.location.origin}/`
- scopes: `https://www.googleapis.com/auth/calendar.readonly`
- query params:
  - `access_type=offline`
  - `prompt=consent`

This configuration is used so calendar-read access is requested and refresh-token-compatible consent is requested.

---

## 8. App Auth Gate State Machine

Root auth gate is in [src/App.jsx](src/App.jsx).

Expected behavior:

1. Loading (`auth.loading` or `auth.profileLoading`):
   - Show splash: Initializing OS
2. Unauthenticated (`!auth.session`):
   - Show login/signup screen
3. Authenticated + not onboarded (`!auth.profile?.onboarded`):
   - Show onboarding flow
4. Authenticated + onboarded:
   - Render `OSProvider` + `AppShell`

This prevents unauthorized users from seeing onboarding/dashboard content.

---

## 9. Login Screen Integration

Auth UI is in [src/components/modules/AuthScreen.jsx](src/components/modules/AuthScreen.jsx).

It supports dual entry:

1. Email/password sign-in and sign-up
2. Continue with Google button wired to `onGoogleSignIn`

---

## 10. Onboarding Persistence

Onboarding is rendered in [src/components/modules/OnboardingFlow.jsx](src/components/modules/OnboardingFlow.jsx) and persisted via [src/hooks/useSupabaseAuth.js](src/hooks/useSupabaseAuth.js).

On completion, the app updates `profiles` with:

- `first_name`
- `username` (legacy compatibility)
- `onboarded = true`
- `settings` payload

This ensures onboarding state is database-backed, not localStorage-backed.

---

## 11. Data Hydration and Sync

Hydration lives in [src/hooks/usePostgresSync.js](src/hooks/usePostgresSync.js).

Current behavior:

1. On authenticated `userId` change, fetches user-scoped rows from Supabase tables.
2. Merges into seed state.
3. Uses `loading` and `syncError` flags to avoid null renders.
4. Persists optimistic updates back to Supabase.

---

## 12. Required Database Shape

Your `profiles` table should include at least:

- `id` (UUID, same as Supabase auth user id)
- `first_name` (text)
- `onboarded` (boolean)
- `settings` (json/jsonb)

In this repo, schema changes are in:

- [server/sql/001_phase7_core.sql](server/sql/001_phase7_core.sql)

---

## 13. Troubleshooting

### Google button opens error or does nothing

- Check Supabase Google provider is enabled.
- Check redirect URLs in Supabase Auth settings.
- Check Google callback URI matches exactly.

### OAuth redirect succeeds but session missing

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Verify `detectSessionInUrl` is enabled in [src/lib/supabase.js](src/lib/supabase.js).

### Onboarding loops

- Verify `profiles.onboarded` updates to `true`.
- Verify profile row exists for the authenticated user id.

### Works locally but not in production

- Add production URL to Supabase Site URL and redirect URLs.
- Add production origin/redirect to Google OAuth credentials.
- Ensure production env variables are set.

---

## 14. Verification Checklist

1. Unauthenticated user sees login screen.
2. Email/password sign-in works.
3. Continue with Google redirects and returns to app.
4. First login routes to onboarding.
5. Completing onboarding sets `profiles.onboarded=true`.
6. Reload keeps session and routes directly to dashboard.

---

## 15. Optional Next Step

If you need server-side Google calendar sync endpoints to trust Supabase session tokens directly, align backend auth middleware to Supabase JWT verification for consistent frontend-to-backend auth.
