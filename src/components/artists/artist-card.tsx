"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { BadgeCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ArtistWithProfile } from "@/lib/data/queries";
import { artistProfileUrl } from "@/lib/username";
import { cn } from "@/lib/utils";

export function ArtistCard({
  artist,
  className,
}: {
  artist: Partial<ArtistWithProfile> & {
    slug: string;
    stage_name: string;
    category?: string;
    verified?: boolean;
    follower_count?: number;
    banner_url?: string | null;
  };
  className?: string;
}) {
  const image =
    artist.banner_url ??
    `https://picsum.photos/seed/${artist.slug}/800/600`;

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn("group", className)}
    >
      <Link href={artistProfileUrl(artist.slug)}>
        <Card className="overflow-hidden border-white/10 bg-card/80 p-0 shadow-xl shadow-black/20">
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image
              src={image}
              alt={artist.stage_name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-semibold">{artist.stage_name}</h3>
                {artist.verified && <BadgeCheck className="size-4 text-primary" />}
              </div>
              {artist.category && (
                <Badge variant="secondary" className="mt-2 capitalize">
                  {artist.category.replace("_", " ")}
                </Badge>
              )}
              <p className="mt-2 flex items-center gap-1 text-xs text-white/70">
                <Users className="size-3.5" />
                {(artist.follower_count ?? 0).toLocaleString()} followers
              </p>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
