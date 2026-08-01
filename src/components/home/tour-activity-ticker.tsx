"use client";

import Link from "next/link";
import type { TourActivityItem } from "@/lib/touring/homepage-data";

/** Subtle premium activity ticker for the homepage. */
export function TourActivityTicker({ items }: { items: TourActivityItem[] }) {
  if (!items.length) return null;

  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-b border-white/5 bg-black/30 py-2.5 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <div className="animate-ticker flex whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={`${item.id}-${i}`} className="mx-8 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary/80" />
            {item.href ? (
              <Link href={item.href} className="transition hover:text-foreground">
                {item.message}
              </Link>
            ) : (
              item.message
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
