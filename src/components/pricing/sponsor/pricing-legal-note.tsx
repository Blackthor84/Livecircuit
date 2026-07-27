"use client";

import { FOUNDER_PROGRAM } from "@/lib/pricing/livecircuit-pricing";
import { cn } from "@/lib/utils";

export function PricingLegalNote({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <p
      className={cn(
        "text-center text-xs leading-relaxed text-muted-foreground",
        !compact && "mx-auto max-w-3xl",
        className
      )}
    >
      {FOUNDER_PROGRAM.legalNote}
    </p>
  );
}
