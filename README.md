# LiveCircuit

**Tour the world without leaving home.**

Production-ready virtual touring platform for live concerts, comedy, podcasts, DJ sets, author talks, and more. Fans register by location so artists see audience concentration on interactive heat maps and plan tours accordingly.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS v4, Shadcn UI, Framer Motion |
| Backend | Supabase (Auth, PostgreSQL, Storage, Realtime) |
| Payments | Stripe Checkout + webhooks |
| Maps | Mapbox (fan heat maps) |
| Streaming | Pluggable provider (`placeholder` → Agora / LiveKit / Mux) |
| Deploy | Vercel |

## Getting started

```bash
cd livecircuit
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Supabase credentials, the UI uses demo artists and events so you can explore the product surface.

### Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Link CLI: `npx supabase link --project-ref YOUR_REF`
3. Apply migrations: `npx supabase db push`
4. Enable Auth providers (Google, GitHub, Apple) in the dashboard.
5. Copy URL and anon key into `.env.local`.

### Stripe

1. Create products/prices or use dynamic `price_data` (already wired in checkout API).
2. Set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and webhook secret pointing to `/api/stripe/webhook`.

### Mapbox

Set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` for interactive US/world fan heat maps on the artist dashboard.

### Streaming

Set `STREAMING_PROVIDER=placeholder` (default). Implement `StreamingProvider` in `src/lib/streaming/provider.ts` for Agora, LiveKit, or Mux.

### Production (rate limits, health, tests)

1. Create an [Upstash Redis](https://upstash.com/) database and set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel. Without these, API rate limits use in-memory buckets (fine for local dev only).
2. Set `CRON_SECRET` (≥16 characters) for `/api/cron/rollup-sponsor-metrics` (see `docs/PERFORMANCE.md`). Vercel Cron is configured in `vercel.json`.
2. Monitor deploys with `GET /api/health` (Supabase, Stripe, Redis checks).
3. Run `npm test` and `npm run typecheck` in CI.
4. After migrations: `npm run db:types` — see `scripts/DATABASE_TYPES.md`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript |
| `npm test` | Vitest unit tests |
| `npm run db:types` | Regenerate Supabase TypeScript types |

## Project structure

```
src/
  app/(site)/          # Marketing + product pages
  app/(auth)/          # Login, register, forgot password
  app/api/             # Stripe, search, stream placeholder
  components/          # UI, live room, maps, dashboard
  lib/                 # Supabase, Stripe, queries, streaming
supabase/migrations/   # PostgreSQL schema + RLS
```

## Key routes

- `/` — Landing
- `/discover`, `/artists`, `/tours`, `/search`
- `/artists/[slug]` — Artist profile
- `/artists/[slug]/tours/[tourSlug]` — Tour stops
- `/artists/[slug]/events/[eventSlug]` — Live experience
- `/checkout` — Stripe checkout
- `/dashboard`, `/artist/dashboard`, `/admin`
- `/settings`, `/notifications`, `/vip`

## Deploy on Vercel

1. Import the `livecircuit` directory as a Vercel project.
2. Add all environment variables from `.env.example`.
3. Configure Stripe webhook URL: `https://your-domain.com/api/stripe/webhook`.
4. Point uptime monitoring at `https://your-domain.com/api/health`.

## License

Proprietary — LiveCircuit (working name).
