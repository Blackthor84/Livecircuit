# LiveCircuit Ecosystem Expansion

Development proceeds **one milestone at a time**. Wait for approval between milestones.

## M1 — AI Tour Planner ✅

### Product
- **Route:** `/artist/tour-planner`
- **API:** `GET /api/artists/[artistId]/tour-planner` (artist owner or admin)
- Analyzes fan heat, historical ticket locations, orders, event schedules (day/hour), watch counts, genre peers, and venue catalog matches.
- Surfaces insights, KPI cards, heat map, scheduling charts, and per-city recommendations (revenue, attendance, risk, profit, growth).
- **Build optimized tour** creates a draft tour with up to 5 stops, venue assignment when matched, synced events.

### Data
- Migration: `20250722000001_ai_tour_planner.sql` — `artist_tour_planner_runs` (JSON plan history)

### Env
- No new keys required for heuristic planner.
- Optional future: `OPENAI_API_KEY` for narrative enrichment (not required in M1).

### Commands
```bash
npx supabase db push   # through 20250722000001
npm run build
npm test
```

## M2 — Artist Momentum Score ✅

### Product
- **Route:** `/artist/momentum`
- **Dashboard:** LiveCircuit Score summary card + **Momentum** nav button
- **API:** `GET /api/artists/[artistId]/momentum` (artist owner or admin)
- **LiveCircuit Score (0–100)** with trend (up / down / stable), 11-factor breakdown, and daily history chart.

### Factors (weighted)
Revenue, growth, followers, engagement (chat), tips, reviews, ticket sales, watch time, returning viewers, cancellation reliability, audience satisfaction.

### Data
- Migration: `20250722000002_artist_momentum.sql` — `artist_momentum_snapshots` (`score`, `trend`, `factors` JSONB, `bucket_date`)
- Heuristic engine: `src/lib/services/artist-momentum.service.ts` (30d vs prior 30d where applicable)
- Upserts one snapshot per artist per UTC day on report load

### Env
- No new keys.

### Commands
```bash
npx supabase db push   # through 20250722000002
npm run build
npm test
```

## M3 — Fan Passport ✅

### Product
- **Route:** `/passport`
- **Fan dashboard:** stamp count + **Open passport**
- **Account menu:** Fan Passport link
- **API:** `GET /api/fans/passport` (authenticated fan)
- Digital passport with collectible **stamps** per attended event (venue, city, state, country, date, artist, VIP, special)
- **Achievements:** First Concert, 100 Concerts, 50 Comedy Shows, VIP Collector, Festival Legend, all U.S. states, all countries, Founding Fan
- Stamps sync from tickets on load; ticket QR check-in triggers immediate sync

### Data
- Migration: `20250722000003_fan_passport.sql` — `fan_passports`, `fan_passport_stamps`, achievement defs + user achievements

### Env
- No new keys.

### Commands
```bash
npx supabase db push   # through 20250722000003
npm run build
npm test
```

## M4 — Seasons ✅

### Product
- **Routes:** `/seasons`, `/seasons/[slug]`, `/seasons/archive`
- **Nav:** Main header **Seasons** link; fan dashboard button
- **API:** `GET /api/seasons`, `GET /api/seasons/[slug]` (optional auth for personal stats)
- Hub for **active**, **upcoming**, and **archived** seasons (Summer Tour, Spring Indie, Halloween, Holiday Festival)
- Per season: **leaderboard**, **badges**, **limited merch**, **venue decorations** (linked `venue_themes`), **reward tiers**, **profile frame** equip action, **season statistics** for signed-in fans

### Points (in-season window)
Tickets +10, passport stamps +25, tips +5, merch orders +15. Progress syncs on season page load; leaderboard refreshes via service role.

### Data
- Migration: `20250722000004_seasons.sql` — `livecircuit_seasons`, badges, merch, progress, leaderboard, `profiles.season_profile_frame`
- New theme seed: `spring-indie`

### Env
- No new keys.

### Commands
```bash
npx supabase db push   # through 20250722000004
npm run build
npm test
```

## M5 — Virtual Festivals ✅

### Product
- **Routes:** `/festivals`, `/festivals/[slug]`
- **Nav:** Main header **Festivals** link
- **API:** `GET /api/festivals`, `GET /api/festivals/[slug]`
- Multi-day festivals with **multiple venues**, **simultaneous schedule slots**, **festival passes** + **VIP upgrades** (Stripe via `type=festival` checkout), **interactive map**, **leaderboard**, **collectibles**, **achievements**
- Seeded: LiveCircuit Summer Fest (live), Comedy Weekend, AnimeCon Live, EDM World, Country Music Festival, Global Podcast Expo

### Checkout
- `type=festival` + `festivalTier` UUID → digital order; webhook fulfillment grants pass, collectibles, achievements

### Data
- Migration: `20250722000005_virtual_festivals.sql`

### Env
- Existing Stripe keys for paid passes.

### Commands
```bash
npx supabase db push   # through 20250722000005
npm run build
npm test
```

## M6 — Backstage Pass ✅

### Product
- **Fan route:** `/artists/[slug]/backstage` — perks, subscribe (Stripe subscription), member Discord, collectibles, announcements
- **Artist route:** `/artist/backstage` — plan pricing/perks, Discord URL, early ticket window, publish announcements, **subscriber analytics** (active, MRR, new this month)
- **`/vip?artist=`** redirects to Backstage Pass
- **Live access:** active Backstage subscription grants VIP room access (syncs `vip_memberships` on subscribe/renew)

### Stripe
- `POST /api/stripe/backstage-subscribe` — Checkout **subscription** mode
- Webhook: `checkout.session.completed` (subscription), `customer.subscription.updated/deleted`, `invoice.paid`

### Data
- Migration: `20250722000006_backstage_pass.sql` — plans, subscriptions, announcements, collectibles; auto-seeds plan per artist

### Env
- Existing `STRIPE_*` and webhook secret; enable subscription events in Stripe Dashboard.

### Commands
```bash
npx supabase db push   # through 20250722000006
npm run build
npm test
```

## M7 — Venue Collections ✅

### Product
- **Route:** `/collections/venues`
- **Dashboard** summary + account menu **Venue collection**
- **API:** `GET /api/fans/venue-collection`
- Syncs visits from **check-ins**, **passport stamps**, and **ticketed events** at venues
- Tracks: visited & favorites, most-attended venue, **completion %**, state/country progress, **venue badges**, hidden / seasonal / Hall of Fame venues

### Data
- Migration: `20250722000007_venue_collections.sql` — `user_venue_visits`, venue flags (`is_hidden`, `is_seasonal`, `is_hall_of_fame`)

### Env
- No new keys.

### Commands
```bash
npx supabase db push   # through 20250722000007
npm run build
npm test
```

## M8 — Friends System ✅

### Product
- **Route:** `/friends` — friend requests, friends list, **following/followers**, **online presence**, **activity feed**, **shared upcoming events**, **suggestions**, **watch together / party mode**
- **Friend DMs:** `/friends/messages`, `/friends/messages/[conversationId]` (separate from artist `/messages`)
- **Watch parties:** `/friends/party/[code]` — invite code join, group chat, link to tied event when set
- **Dashboard** summary + header nav **Friends** + account menu
- **API:** `GET /api/friends`

### Data
- Migration: `20250722000008_friends_system.sql` — `friendships`, `user_follows`, `user_presence`, `friend_activity_events`, `friend_conversations`, `friend_messages`, `watch_parties`, `watch_party_members`, `watch_party_messages`

### Env
- No new keys.

### Commands
```bash
npx supabase db push   # through 20250722000008
npm run build
npm test
```

## M9 — LiveCircuit Coins ✅

### Product
- **Route:** `/coins` — balance, **daily claim**, earn guide, **referral link**, transaction history, **coin shop**
- **Spend categories:** avatar, themes, animations, badges, profile customization, venue collectibles, digital merch, exclusive reactions (equip where applicable)
- **Earn:** daily login, live check-in (watching), venue reviews, passport achievements, season badges, referrals, friend connections
- **Dashboard** balance card + account menu **Coins**
- **API:** `GET /api/fans/coins`
- **Register:** `?ref=CODE` stores referral cookie; credits applied on first session finalize

### Data
- Migration: `20250722000009_livecircuit_coins.sql` — wallets, ledger (idempotent `source_key`), shop catalog, inventory, equipment, daily claims, referral codes/redemptions

### Env
- No new keys (uses existing Supabase service role for ledger writes).

### Commands
```bash
npx supabase db push   # through 20250722000009
npm run build
npm test
```

## M10 — Creator Marketplace ✅

### Product
- **Routes:** `/marketplace` (browse), `/marketplace/creators/[slug]` (portfolio, reviews, pricing, book), `/marketplace/studio` (creator profile + portfolio), `/marketplace/bookings`, `/marketplace/bookings/[id]` (messages, accept/decline, pay, complete, review)
- **Specialties:** graphic design, moderation, video, photo, management, production, animation, lighting, marketing, voice (10 categories)
- **Artist flow:** request booking → creator accepts with rate → **Stripe** pay → messaging → mark complete → **rating/review**
- **API:** `GET /api/marketplace`, `GET /api/marketplace/creators/[slug]`, `POST /api/stripe/marketplace-checkout`
- **Artist dashboard:** **Hire creators** button

### Data
- Migration: `20250722000010_creator_marketplace.sql` — creator profiles, portfolio, bookings, booking messages, reviews

### Env
- Existing `STRIPE_*` for marketplace checkout + webhook (`metadata.type=marketplace`).

### Commands
```bash
npx supabase db push   # through 20250722000010
npm run build
npm test
```

## M11 — Local Business Marketplace ✅

### Product
- **Routes:** `/local-business` (hub), `/local-business/[slug]` (coupons, venues, campaigns), `/local-business/dashboard` (profile, venue links, coupons, **campaign checkout**, analytics, redemption log)
- **Venue route:** `/livecircuit/venues/[slug]/local` — businesses linked to each venue; CTA on venue landing
- **Categories:** restaurant, hotel, coffee, parking, museum, tourism, attraction
- **Campaigns (Stripe):** featured listing, coupon boost, venue ad, festival sponsor, homepage promo — 30-day active window after payment
- **Fans:** redeem coupons (tracked per user); impressions/clicks roll into campaign analytics
- **API:** `GET /api/local-business`, `GET /api/local-business/[slug]`, `GET /api/venues/[slug]/local-business`, `POST /api/stripe/local-business-campaign`

### Data
- Migration: `20250722000011_local_business_marketplace.sql`

### Env
- Existing `STRIPE_*`; webhook handles `metadata.type=local_business_campaign`.

### Commands
```bash
npx supabase db push   # through 20250722000011
npm run build
npm test
```

## M12 — Venue TV Network ✅

### Product
- **Route:** `/livecircuit/venues/[slug]/tv` — per-venue television channel with **now playing**, **up next**, and **program guide**
- **Auto playlist** sync on load: upcoming shows, highlights, festival announcements, sponsor spots, trailers, venue news (from events, festivals, ad schedules)
- **Venue landing:** **Venue TV** button alongside concourse/local
- **API:** `GET /api/venues/[slug]/tv`
- View tracking via `recordVenueTvViewAction` (program views table)

### Data
- Migration: `20250722000012_venue_tv_network.sql` — channels, programs, playlists, playlist items, views

### Env
- No new keys.

### Commands
```bash
npx supabase db push   # through 20250722000012
npm run build
npm test
```

## M13 — Hall of Fame ✅

### Product
- **Route:** `/livecircuit/venues/[slug]/hall-of-fame` — nine legend categories per venue with metrics and links
- **Categories:** top attendance, top revenue, most viewed, highest rated, most tips, most merchandise, longest running show, fan favorite, most loyal fans
- **Auto sync** from tickets, chat, reviews, tips, merch orders, event duration, venue loyalty
- **Venue landing:** **Hall of Fame** button; badge when venue has `is_hall_of_fame` flag
- **API:** `GET /api/venues/[slug]/hall-of-fame`

### Data
- Migration: `20250722000013_venue_hall_of_fame.sql` — `venue_hall_of_fame_entries`

### Env
- No new keys.

### Commands
```bash
npx supabase db push   # through 20250722000013
npm run build
npm test
```

## M14 — Digital Walk of Fame ✅

### Product
- **Routes:** `/walk-of-fame`, `/walk-of-fame/[artistSlug]`
- **Nav:** Main header **Walk of Fame** link
- **Artist profile:** **Walk of Fame** button; venue Hall of Fame links to global walk
- **API:** `GET /api/walk-of-fame`, `GET /api/walk-of-fame/[artistSlug]`
- **Seven permanent star criteria:** attendance, revenue, years active, community impact, fan votes, awards, venue contributions
- **Interactive stars:** tap a lit star for summary, metric, and artist link
- **Fan votes:** signed-in fans vote once per artist via `castWalkOfFameVoteAction`; votes sync toward Fan Choice star (25+ votes)
- **Auto sync** on hub/artist load via service role (tickets, orders, tenure, chat/reviews/tips/followers, HoF honors, distinct venues)

### Data
- Migration: `20250722000014_digital_walk_of_fame.sql` — `artist_walk_of_fame_stars`, `artist_walk_of_fame_votes`

### Env
- No new keys.

### Commands
```bash
npx supabase db push   # through 20250722000014
npm run build
npm test
```

## M15 — LiveCircuit Awards ✅

### Product
- **Routes:** `/awards`, `/awards/[slug]`, `/awards/archive`
- **Nav:** Main header **Awards** link
- **API:** `GET /api/awards`, `GET /api/awards/[slug]`
- **Ten categories:** Artist of the Year, Concert of the Year, Comedian, DJ, Podcast, Venue of the Year, Best New Artist, Fan Favorite, Best Community, Highest Rated Event
- **Nominees** auto-sync from artists, events, venues, reviews, chat, and Walk of Fame votes (service role; frozen once voting opens with nominees present)
- **Fan voting:** one vote per category per fan via `castAwardVoteAction`
- **Countdown** to voting deadline and live ceremony
- **Live award show** block with stream link when ceremony is live or upcoming
- **Historical archive** for past ceremonies (seeded 2025 + active 2026 voting)

### Data
- Migration: `20250722000015_livecircuit_awards.sql` — ceremonies, nominees, votes

### Env
- No new keys.

### Commands
```bash
npx supabase db push   # through 20250722000015
npm run build
npm test
```

## M16 — LiveCircuit World ✅

### Product
- **Route:** `/world` — flagship interactive globe (Mapbox `globe` projection, fog, animated live markers)
- **Nav:** Main header **World** link (first item)
- **API:** `GET /api/world`
- **Zoom trail:** Earth → Country → State → City → Venue → Concourse → Event (derived from map zoom + drill-down links)
- **Explore:** fly/zoom, glowing live venues, category filters, search, attendance/concourse counts, weather placeholders, approximate local time, trending regions, featured festival pins, venue density label
- **Selection panel:** venue / concourse / live event deep links
- **Demo** map list when `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is unset

### Data
- Migration: `20250722000016_livecircuit_world.sql` — `livecircuit_world_trending_regions` cache + city coordinate index
- Aggregates from venues, cities, live events, festivals; trending sync via service role

### Env
- Optional: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (required for full globe; fallback list UI without it)

### Commands
```bash
npx supabase db push   # through 20250722000016
npm run build
npm test
```

## M17 — Achievements expansion ✅

### Product
- **Route:** `/achievements` (signed-in fans)
- **Account menu:** **Achievements** link; fan dashboard progress + count
- **API:** `GET /api/fans/achievements`
- **Catalog:** 52+ milestones across 15 categories (attendance, VIP, friends, reviews, tips, merch, festivals, venues, countries, genres, seasons, marketplace, sponsors, passport, coins) — schema ready to grow toward hundreds
- **Progress:** sync on load from tickets, tips, reviews, friends, merch, festivals, seasons, marketplace bookings, venue check-ins, passport unlocks, coin lifetime earned
- **UI:** category filters, progress bars, earned badges; links to Passport and Coins
- **Rewards:** newly unlocked achievements grant LiveCircuit Coins (same rate as passport achievements)

### Data
- Migration: `20250722000017_achievements_expansion.sql` — `livecircuit_achievement_defs`, `livecircuit_user_achievement_progress`

### Env
- No new keys.

### Commands
```bash
npx supabase db push   # through 20250722000017
npm run build
npm test
```

## M18 — Gamification ✅

### Product
- **Route:** `/gamification` (signed-in fans)
- **Account menu:** **Gamification** link; dashboard shows level
- **API:** `GET /api/fans/gamification`
- **Daily quests** (5), **weekly challenges** (5), **monthly goals** (5) with progress bars and auto-completion on sync
- **XP & levels** from quest rewards (quadratic level curve); **prestige** every 15 levels
- **Titles** unlock by level/prestige; equip via `equipGamificationTitleAction`
- **Rewards:** quest completion grants XP (+ optional coins, idempotent per quest period)
- **Leaderboard:** top 10 fans by total XP

### Data
- Migration: `20250722000018_gamification.sql` — profiles, quest defs, progress, XP events

### Env
- No new keys.

### Commands
```bash
npx supabase db push   # through 20250722000018
npm run build
npm test
```

## Upcoming (order)
19. (Roadmap complete — polish & scale as needed)  

