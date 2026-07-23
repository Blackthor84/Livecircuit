"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Radio, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { VenueListItem } from "@/lib/data/venues";
import type { VenueThemeChip } from "@/lib/venues/theme";
import { cn } from "@/lib/utils";

export function VenueCard({
  venue,
  themeChip,
  className,
}: {
  venue: VenueListItem;
  themeChip?: VenueThemeChip | null;
  className?: string;
}) {
  const image =
    venue.hero_image_url ??
    venue.banner_url ??
    `https://picsum.photos/seed/venue-${venue.slug}/800/600`;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn("group", className)}
    >
      <Link href={`/livecircuit/venues/${venue.slug}`}>
        <Card className="overflow-hidden border-white/10 bg-card/80 p-0 shadow-xl shadow-black/20">
          <div className="relative aspect-[16/10] overflow-hidden">
            <Image
              src={image}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-primary/10" />
            {themeChip ? (
              <Badge className="absolute right-3 top-3 gap-1 bg-black/50 text-white backdrop-blur-sm">
                {themeChip.icon ? <span aria-hidden>{themeChip.icon}</span> : null}
                {themeChip.name}
              </Badge>
            ) : null}
            {venue.current_visitors > 0 ? (
              <Badge className="absolute left-3 top-3 gap-1 bg-red-500/90 text-white animate-pulse">
                <Radio className="size-3" />
                Live now
              </Badge>
            ) : null}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-xs uppercase tracking-wider text-white/60">
                {venue.venue_types?.name ?? "Venue"}
              </p>
              <h3 className="text-lg font-semibold leading-tight">{venue.name}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
                <MapPin className="size-3.5" />
                {venue.region}
                {venue.state_code ? `, ${venue.state_code}` : ""}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs text-white/70">
                <Users className="size-3.5" />
                {venue.follower_count.toLocaleString()} followers ·{" "}
                {venue.current_visitors.toLocaleString()} in venue
              </p>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
