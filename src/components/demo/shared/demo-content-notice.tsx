"use client";

import { cn } from "@/lib/utils";

const DISCLAIMER =
  "Artists, tours, venues, analytics, and events shown in this demo are fictional and are provided solely to demonstrate the LiveCircuit platform.";

type DemoContentNoticeProps = {
  className?: string;
  variant?: "footer" | "inline";
};

/** Subtle demo disclaimer — demo routes only */
export function DemoContentNotice({ className, variant = "footer" }: DemoContentNoticeProps) {
  if (variant === "inline") {
    return (
      <p className={cn("text-[10px] leading-relaxed text-muted-foreground/70", className)}>
        {DISCLAIMER}
      </p>
    );
  }

  return (
    <footer
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-40 px-4 pb-3 pt-8",
        "bg-gradient-to-t from-black/80 via-black/40 to-transparent",
        className,
      )}
    >
      <p className="mx-auto max-w-lg text-center text-[10px] leading-relaxed text-white/35">
        {DISCLAIMER}
      </p>
    </footer>
  );
}
