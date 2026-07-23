"use client";

import Link from "next/link";
import { AdvertisementImpressionBeacon } from "@/components/sponsor/advertisement-impression-beacon";
import { cn } from "@/lib/utils";

export function VenueSponsorBanner({
  title,
  subtitle,
  imageUrl,
  href,
  advertisementId,
  billboardId,
  venueId,
  className,
}: {
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  href?: string | null;
  advertisementId?: string | null;
  billboardId?: string | null;
  venueId?: string | null;
  className?: string;
}) {
  const inner = (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 p-6 sm:p-8",
        "bg-gradient-to-r from-primary/30 via-accent/20 to-primary/10",
        "animate-[shimmer_8s_ease-in-out_infinite] bg-[length:200%_100%]",
        className
      )}
      style={{
        backgroundImage: imageUrl
          ? `linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0.4)), url(${imageUrl})`
          : undefined,
        backgroundSize: imageUrl ? "cover" : undefined,
        backgroundPosition: "center",
      }}
    >
      <div className="relative z-10 max-w-xl">
        <p className="text-xs font-medium uppercase tracking-widest text-white/70">Presented by</p>
        <p className="mt-1 text-2xl font-bold sm:text-3xl">{title}</p>
        {subtitle ? <p className="mt-2 text-sm text-white/80">{subtitle}</p> : null}
      </div>
      <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/3 size-56 rounded-full bg-accent/20 blur-3xl" />
    </div>
  );

  const beacon =
    advertisementId ? (
      <AdvertisementImpressionBeacon
        advertisementId={advertisementId}
        billboardId={billboardId ?? undefined}
        venueId={venueId ?? undefined}
      />
    ) : null;

  if (href) {
    return (
      <>
        {beacon}
        <Link href={href} target="_blank" rel="noopener noreferrer" className="block transition hover:opacity-95">
          {inner}
        </Link>
      </>
    );
  }

  return (
    <>
      {beacon}
      {inner}
    </>
  );
}
