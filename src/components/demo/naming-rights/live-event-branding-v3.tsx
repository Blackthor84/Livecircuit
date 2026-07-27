"use client";

import { Eye } from "lucide-react";
import { MobileAppPreview } from "@/components/demo/naming-rights/mobile-app-preview";
import { TicketMockup } from "@/components/demo/naming-rights/ticket-mockup";
import { FadeUp, FadeUpStagger, FadeUpItem } from "@/components/demo/naming-rights/fade-up";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { Badge } from "@/components/ui/badge";
import { EVENT_TYPES } from "@/lib/demo/sponsor-visualizer-steps";

export function LiveEventBrandingV3() {
  const { displayCompany, arenaName, theme, form } = useSponsorVisualizer();
  const event = EVENT_TYPES.find((e) => e.id === form.eventType) ?? EVENT_TYPES[0];

  return (
    <div className="space-y-10">
      <FadeUp className="glass-panel rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge variant="secondary" className="border-red-500/30 text-red-400">
              LIVE NOW
            </Badge>
            <h3 className="mt-4 text-2xl font-bold">{event.label}</h3>
            <p className="mt-2 text-muted-foreground">{event.vibe}</p>
          </div>
          <p className="flex items-center gap-2 text-sm">
            <Eye className="size-4" />
            {form.expectedAttendance.toLocaleString()} fans
          </p>
        </div>
        <p className="mt-6 text-sm font-medium" style={{ color: theme.gold }}>
          Presented by {displayCompany}
        </p>
      </FadeUp>

      <FadeUpStagger className="grid gap-4 lg:grid-cols-3">
        <FadeUpItem>
          <TicketMockup companyName={displayCompany} arenaName={arenaName} theme={theme} />
        </FadeUpItem>
        <FadeUpItem>
          <div className="glass-panel h-full rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Website listing</p>
            <div className="mt-4 rounded-xl border border-white/10 p-4">
              <p className="text-lg font-bold">{event.label}</p>
              <p className="text-sm text-muted-foreground">{arenaName}</p>
              <p className="mt-3 text-xs" style={{ color: theme.gold }}>
                Sponsored by {displayCompany}
              </p>
            </div>
          </div>
        </FadeUpItem>
        <FadeUpItem>
          <MobileAppPreview companyName={displayCompany} arenaName={arenaName} theme={theme} />
        </FadeUpItem>
      </FadeUpStagger>
    </div>
  );
}
