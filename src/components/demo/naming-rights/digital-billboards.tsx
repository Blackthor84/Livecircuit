"use client";

import { useEffect, useState } from "react";
import { BILLBOARD_MESSAGES } from "@/lib/demo/naming-rights-data";
import type { BrandTheme } from "@/lib/demo/naming-rights-utils";
import { cn } from "@/lib/utils";

export function DigitalBillboards({
  companyName,
  arenaName,
  theme,
}: {
  companyName: string;
  arenaName: string;
  theme: BrandTheme;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const messages = BILLBOARD_MESSAGES.map((fn) => fn(companyName, arenaName));

  useEffect(() => {
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % messages.length);
    }, 4000);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={cn(
            "relative overflow-hidden rounded-xl border p-6 transition-all duration-700",
            i === activeIndex ? "scale-[1.02] border-amber-500/40 shadow-lg shadow-amber-500/10" : "border-white/10 opacity-80"
          )}
          style={{
            background: i === activeIndex
              ? `linear-gradient(135deg, oklch(0.16 0.03 280), ${theme.primary}15)`
              : "oklch(0.14 0.025 280 / 0.8)",
          }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 3px, oklch(1 0 0 / 0.04) 3px, oklch(1 0 0 / 0.04) 6px)",
            }}
          />
          {msg.accent ? (
            <p className="relative text-xs font-semibold uppercase tracking-widest" style={{ color: theme.gold }}>
              {msg.line1}
            </p>
          ) : (
            <p className="relative text-xs uppercase tracking-wider text-muted-foreground">{msg.line1}</p>
          )}
          <p className="relative mt-3 text-lg font-bold leading-snug">{msg.line2}</p>
          {i === activeIndex ? (
            <span className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] text-red-400">
              <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
              LIVE
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
