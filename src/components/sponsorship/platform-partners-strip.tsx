import Image from "next/image";
import type { PremiumSponsorshipContract } from "@/lib/sponsorship/inventory";

/** Subtle platform-wide partner credits — one line, no banner flooding. */
export function PlatformPartnersStrip({ sponsors }: { sponsors: PremiumSponsorshipContract[] }) {
  if (!sponsors.length) return null;

  return (
    <div className="border-y border-white/5 bg-white/[0.02] py-3">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 text-xs text-muted-foreground sm:px-6">
        <span className="uppercase tracking-wide">Official partners</span>
        {sponsors.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1.5">
            {s.logoUrl ? (
              <Image src={s.logoUrl} alt="" width={16} height={16} className="size-4 object-contain opacity-70" />
            ) : null}
            {s.displayLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
