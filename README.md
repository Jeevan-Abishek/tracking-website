# Trailmark — Live GPS Route Sharing

Swiggy/Zomato style live-tracking: a **rider** shares their live GPS route,
a **tracker** watches it on a map in real time using a 6-character code.

**Stack:** Next.js 14 (App Router, TS) · Tailwind + shadcn-style UI ·
Supabase (Postgres, Auth, Realtime, RLS) · MapLibre GL + OpenStreetMap ·
Render + GitHub Actions · JWT auth, RLS, security headers.

---

## 1. Supabase setup (10 min)

1. Create a free project at https://supabase.com/dashboard.
2. Go to **SQL Editor** → paste the contents of `supabase/schema.sql` → Run.
   This creates the `trips` / `trip_points` tables, RLS policies, the
   secure `get_trip_by_code` RPC, and enables Realtime.
3. Go to **Authentication → Providers** → make sure **Email** is enabled
   (magic link / OTP — no password flow needed).
4. Go to **Authentication → URL Configuration** → add your deployed URL
   (and `http://localhost:3000` for dev) to **Redirect URLs**.
5. Go to **Project Settings → API** → copy the **Project URL** and
   **anon public key**.

## 2. Local setup

```bash
cp .env.example .env.local
# paste your Supabase URL + anon key into .env.local

npm install
npm run dev
```

Open http://localhost:3000. Location sharing needs HTTPS or `localhost`
(browsers block geolocation on plain HTTP).

## 3. Deploy — GitHub + Render

1. Push this repo to GitHub.
2. On Render: **New → Blueprint** → connect the repo → it reads
   `render.yaml` automatically.
3. In the Render dashboard, set the env vars
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (marked `sync: false` so they're set manually, not committed).
4. Grab the service's **Deploy Hook URL** (Settings → Deploy Hook).

## 4. GitHub Actions CI/CD

Add these repo secrets (**Settings → Secrets and variables → Actions**):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RENDER_DEPLOY_HOOK_URL`

Every push to `main` now: installs → lints → builds (catches errors
before deploy) → triggers the Render deploy hook. PRs only run the
build/lint check.

## 5. Security notes

- **Auth:** Supabase email magic-link issues a JWT session; refreshed
  automatically by `middleware.ts` on every request.
- **RLS:** Riders can only read/write their own trips (`auth.uid() =
  rider_id`). Trackers never get direct table access — they go through
  `get_trip_by_code()`, a `SECURITY DEFINER` RPC that requires the exact
  share code, so there's no way to enumerate other people's trips.
- **Transport:** Render terminates HTTPS by default. `next.config.mjs`
  adds HSTS, CSP, X-Frame-Options, and restricts the `Permissions-Policy`
  to only allow geolocation.
- **Codes:** 6 chars from a 32-character set (no ambiguous 0/O/1/I),
  ~1 billion combinations — brute-forcing a live code isn't practical
  within a trip's short lifetime.

## 6. What's next (post-launch hardening)

- Add expiry: auto-end trips after N hours of inactivity (a scheduled
  Supabase Edge Function or pg_cron job).
- Rate-limit `get_trip_by_code` (e.g. via Supabase Edge Function +
  Upstash) to slow down code-guessing.
- Push notifications when a tracked rider goes offline.
