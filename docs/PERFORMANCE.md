# Performance & scalability (Venue Network — M11)

## Caching

- **Next.js Data Cache:** Public venue reads use `unstable_cache` with tags `venue:{slug}` and `venues:directory` (60s revalidate). Admin mutations call `revalidateVenuePublicCache(slug)` alongside existing `revalidatePath`.
- **CDN:** Venue public APIs send `Cache-Control: public, s-maxage=…, stale-while-revalidate=…` via `src/lib/api/cache-headers.ts`.
- **Rate limits:** Upstash Redis when `UPSTASH_REDIS_REST_*` is set; in-memory fallback for local dev.

## Cron workers

| Route | Schedule (Vercel) | Purpose |
|-------|-------------------|---------|
| `POST /api/cron/rollup-sponsor-metrics?days=2` | Daily 06:15 UTC | Rolls raw ad impressions/clicks into `sponsor_campaign_metrics_daily` |

Authorize with `Authorization: Bearer $CRON_SECRET` or header `x-cron-secret`. Set `CRON_SECRET` (≥16 chars) in production.

Manual backfill:

```bash
curl -X POST "https://your-app/api/cron/rollup-sponsor-metrics?days=7" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Single day:

```bash
curl -X POST "https://your-app/api/cron/rollup-sponsor-metrics?bucket=2025-07-20" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Impression table scale

Migration `20250721000015_performance_impressions.sql` adds:

- **BRIN indexes** on `advertisement_impressions.created_at` and `advertisement_clicks.created_at` for time-range analytics.
- **`rollup_sponsor_campaign_metrics_daily(date)`** — SECURITY DEFINER RPC (service role only) for batch daily metrics.

When impression volume grows large (~10M+ rows), migrate to **RANGE partitioning on `created_at`** (monthly child tables). New partitions can be attached without rewriting hot paths if the parent is declared `PARTITION BY RANGE (created_at)`.

## Pagination

- **Community posts:** cursor pagination via `?cursor=<iso>&limit=` on `GET /api/venues/[slug]/community` (pinned posts always on page 1).
- **Venue events:** page/limit on `GET /api/venues/[slug]/events` (existing).
- **Sponsor analytics:** raw impression reads capped at 5,000 rows per request window in application code; prefer daily rollup table for dashboards.

## Read replicas

Point read-heavy Supabase clients at a replica URL when available (future: `SUPABASE_READ_REPLICA_URL` + dedicated server client for cached public loaders only). Not required for current traffic.

## Applying

```bash
npx supabase db push   # through 20250721000015
```

Ensure `CRON_SECRET` and optional Upstash vars are set on Vercel.
