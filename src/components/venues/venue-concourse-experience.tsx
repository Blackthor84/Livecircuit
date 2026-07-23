"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Camera,
  Coffee,
  Heart,
  Info,
  LayoutGrid,
  Megaphone,
  Radio,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VenueSponsorBanner } from "@/components/venues/venue-sponsor-banner";
import { recordConcourseCheckInAction, trackConcourseAdClickAction } from "@/lib/actions/concourse";
import { formatCents } from "@/lib/format";
import type { VenueConcoursePageData, ConcourseShopPublic } from "@/lib/data/concourse";
import type { VenueEventCard } from "@/lib/data/venues";
import { cn } from "@/lib/utils";

const kindIcons: Record<string, typeof Store> = {
  merchandise: ShoppingBag,
  food_sponsor: Coffee,
  advertisement_kiosk: Megaphone,
  photo_booth: Camera,
  meet_and_greet: Users,
  event_board: LayoutGrid,
  venue_directory: LayoutGrid,
  local_business: Store,
  charity: Heart,
  information_desk: Info,
  interactive: Sparkles,
};

type Props = {
  data: VenueConcoursePageData;
  highlightEventId?: string | null;
  userSignedIn: boolean;
};

export function VenueConcourseExperience({ data, highlightEventId, userSignedIn }: Props) {
  useEffect(() => {
    if (!userSignedIn) return;
    void recordConcourseCheckInAction({ venueId: data.venue.id, eventId: highlightEventId ?? null });
  }, [data.venue.id, highlightEventId, userSignedIn]);

  const primaryBillboardSlot = data.billboards.find((b) => b.advertisement);
  const primaryBillboard = primaryBillboardSlot?.advertisement;

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary" className="mb-2">
            Digital concourse
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{data.venue.name}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Explore shops and sponsor booths before entering your show. Each performance runs in its own room —
            shared venue, separate chat and tickets.
          </p>
        </div>
        <Button variant="outline" href={`/livecircuit/venues/${data.venue.slug}`}>
          Venue overview
        </Button>
      </header>

      {data.live_events.length > 0 ? (
        <section className="glass-panel rounded-2xl border border-red-500/20 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Radio className="size-5 text-red-500 animate-pulse" />
            {data.live_events.length} live now
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.live_events.map((ev) => (
              <EventEnterCard key={ev.id} event={ev} venueSlug={data.venue.slug} highlighted={ev.id === highlightEventId} />
            ))}
          </div>
        </section>
      ) : null}

      {primaryBillboard ? (
        <VenueSponsorBanner
          title={primaryBillboard.name}
          subtitle="Concourse partner"
          imageUrl={primaryBillboard.asset_url}
          href={primaryBillboard.click_url}
          advertisementId={primaryBillboard.id}
          billboardId={primaryBillboardSlot?.id}
          venueId={data.venue.id}
        />
      ) : null}

      {data.announcements.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Announcements</h2>
          {data.announcements.map((a) => (
            <div key={a.id} className="glass-panel rounded-xl p-4">
              <p className="font-medium">{a.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Concourse map</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          VR-ready layout — booth positions stored as spatial anchors for future walkthrough mode.
        </p>
        <ConcourseMap shops={data.shops} venueSlug={data.venue.slug} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Shops & booths</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.shops.map((shop, i) => (
              <ShopCard key={shop.id} shop={shop} index={i} venueId={data.venue.id} />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-lg font-semibold">Tonight&apos;s board</h2>
            <ul className="mt-4 space-y-3">
              {data.upcoming_events.length ? (
                data.upcoming_events.map((ev) => (
                  <EventEnterCard
                    key={ev.id}
                    event={ev}
                    venueSlug={data.venue.slug}
                    compact
                    highlighted={ev.id === highlightEventId}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming shows scheduled.</p>
              )}
            </ul>
          </div>
          <BillboardRow billboards={data.billboards} venueId={data.venue.id} />
        </div>
      </section>

      <section className="glass-panel rounded-xl p-6">
        <h2 className="text-lg font-semibold">Venue directory</h2>
        <p className="mt-1 text-sm text-muted-foreground">Other LiveCircuit venues to explore.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.venue_directory.map((v) => (
            <Button key={v.id} size="sm" variant="secondary" href={`/livecircuit/venues/${v.slug}/concourse`}>
              {v.name}
            </Button>
          ))}
        </div>
      </section>

      {Object.keys(data.vr_config).length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          Spatial config loaded · VR client hooks: {String(data.vr_config.schemaVersion ?? "v1")}
        </p>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Spatial metadata: {JSON.stringify(data.concourse_layout).slice(0, 80) || "{}"}…
        </p>
      )}
    </div>
  );
}

function ConcourseMap({ shops, venueSlug }: { shops: ConcourseShopPublic[]; venueSlug: string }) {
  const cells = useMemo(() => {
    const maxX = Math.max(6, ...shops.map((s) => (s.zone?.x ?? 0) + (s.zone?.w ?? 1)));
    const maxY = Math.max(3, ...shops.map((s) => (s.zone?.y ?? 0) + (s.zone?.h ?? 1)));
    return { maxX, maxY };
  }, [shops]);

  return (
    <div
      className="mt-6 grid gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-primary/10 via-background to-accent/5 p-4"
      style={{
        gridTemplateColumns: `repeat(${cells.maxX}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${cells.maxY}, minmax(4rem, auto))`,
      }}
    >
      {shops.map((shop) => {
        const Icon = kindIcons[shop.kind] ?? Store;
        const x = shop.zone?.x ?? 0;
        const y = shop.zone?.y ?? 0;
        const w = shop.zone?.w ?? 1;
        const h = shop.zone?.h ?? 1;
        return (
          <motion.div
            key={shop.id}
            whileHover={{ scale: 1.02 }}
            className="glass-panel flex flex-col items-center justify-center rounded-xl p-3 text-center"
            style={{
              gridColumn: `${x + 1} / span ${w}`,
              gridRow: `${y + 1} / span ${h}`,
            }}
          >
            <Icon className="size-6 text-primary" />
            <p className="mt-2 text-xs font-medium leading-tight">{shop.name}</p>
            {shop.zone?.vrAnchor ? (
              <span className="mt-1 text-[10px] text-muted-foreground">{shop.zone.vrAnchor}</span>
            ) : null}
          </motion.div>
        );
      })}
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-white/20 p-2 text-xs text-muted-foreground"
        style={{ gridColumn: `${cells.maxX} / span 1`, gridRow: `${cells.maxY} / span 1` }}
      >
        <Link href={`/livecircuit/venues/${venueSlug}`} className="hover:text-primary">
          Exit to plaza
        </Link>
      </div>
    </div>
  );
}

function ShopCard({
  shop,
  index,
  venueId,
}: {
  shop: ConcourseShopPublic;
  index: number;
  venueId: string;
}) {
  const Icon = kindIcons[shop.kind] ?? Store;
  const sponsor = Array.isArray(shop.sponsor_organizations)
    ? shop.sponsor_organizations[0]
    : shop.sponsor_organizations;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-panel overflow-hidden rounded-xl"
    >
      {shop.banner_url ? (
        <div className="relative h-24">
          <Image src={shop.banner_url} alt="" fill className="object-cover" />
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
          <Icon className="size-8 text-primary" />
        </div>
      )}
      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{shop.kind.replace(/_/g, " ")}</p>
        <p className="font-semibold">{shop.name}</p>
        {sponsor?.name ? <p className="text-xs text-primary">Presented by {sponsor.name}</p> : null}
        {shop.description ? <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{shop.description}</p> : null}
        {shop.products?.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {shop.products.slice(0, 3).map((row) => {
              const p = Array.isArray(row.products) ? row.products[0] : row.products;
              if (!p) return null;
              const artistSlug = Array.isArray(p.artists) ? p.artists[0]?.slug : p.artists?.slug;
              const href =
                row.external_url ||
                (artistSlug ? `/artists/${artistSlug}/merch` : `/checkout?product=${p.id}`);
              return (
                <li key={row.id}>
                  <Link href={href} className="text-primary hover:underline">
                    {p.name} · {formatCents(p.price_cents)}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
        {shop.external_url ? (
          <Button size="sm" className="mt-3" variant="secondary" href={shop.external_url}>
            Visit booth
          </Button>
        ) : shop.kind === "venue_directory" ? (
          <Button size="sm" className="mt-3" variant="secondary" href="/livecircuit/venues">
            Browse venues
          </Button>
        ) : (
          <Button
            size="sm"
            className="mt-3"
            variant="outline"
            onClick={() =>
              void recordConcourseCheckInAction({ venueId, concourseShopId: shop.id }).then((r) => {
                if (r.ok) toast.success(`Checked in at ${shop.name}`);
                else if (r.error !== "Sign in to check in") toast.error(r.error);
              })
            }
          >
            Check in
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function EventEnterCard({
  event,
  venueSlug,
  compact,
  highlighted,
}: {
  event: VenueEventCard;
  venueSlug: string;
  compact?: boolean;
  highlighted?: boolean;
}) {
  const artistSlug = event.artists?.slug;
  const href = artistSlug
    ? `/artists/${artistSlug}/events/${event.slug}?via=concourse&venue=${venueSlug}`
    : "#";

  return (
    <div
      className={cn(
        "rounded-lg border border-white/10 p-3",
        highlighted && "border-primary/50 bg-primary/5",
        compact ? "text-sm" : ""
      )}
    >
      <p className="font-medium">{event.title}</p>
      <p className="text-xs text-muted-foreground">
        {event.artists?.stage_name}
        {event.venue_room_label ? ` · ${event.venue_room_label}` : ""}
      </p>
      <Button size="sm" className="mt-2" href={href} disabled={!artistSlug}>
        Enter show
      </Button>
    </div>
  );
}

function BillboardRow({
  billboards,
  venueId,
}: {
  billboards: VenueConcoursePageData["billboards"];
  venueId: string;
}) {
  const withAds = billboards.filter((b) => b.advertisement);
  if (!withAds.length) return null;

  return (
    <div className="glass-panel rounded-xl p-6">
      <h2 className="text-lg font-semibold">Sponsor kiosks</h2>
      <ul className="mt-4 space-y-3">
        {withAds.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              className="w-full rounded-lg border border-white/10 p-3 text-left transition hover:border-primary/40"
              onClick={() => {
                if (!b.advertisement) return;
                void trackConcourseAdClickAction({
                  advertisementId: b.advertisement.id,
                  billboardId: b.id,
                  venueId,
                });
                if (b.advertisement.click_url) {
                  window.open(b.advertisement.click_url, "_blank", "noopener,noreferrer");
                }
              }}
            >
              <p className="font-medium">{b.advertisement?.name}</p>
              <p className="text-xs text-muted-foreground">{b.label}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
