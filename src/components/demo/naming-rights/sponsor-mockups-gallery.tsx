"use client";

import { FadeUp, FadeUpItem, FadeUpStagger } from "@/components/demo/naming-rights/fade-up";
import { MobileAppPreview } from "@/components/demo/naming-rights/mobile-app-preview";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { TicketMockup } from "@/components/demo/naming-rights/ticket-mockup";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { SPONSOR_MOCKUP_TYPES } from "@/lib/demo/sponsor-visualizer-steps";

export function SponsorMockupsGallery() {
  const { displayCompany, arenaName, theme, form } = useSponsorVisualizer();

  return (
    <FadeUpStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {SPONSOR_MOCKUP_TYPES.map((label, i) => (
        <FadeUpItem key={label}>
          <div className="glass-panel group overflow-hidden rounded-xl transition hover:-translate-y-0.5 hover:border-amber-500/25">
            <p className="border-b border-white/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <div className="p-4">
              {label === "Tickets" ? (
                <TicketMockup companyName={displayCompany} arenaName={arenaName} theme={theme} />
              ) : label === "Mobile App" ? (
                <MobileAppPreview companyName={displayCompany} arenaName={arenaName} theme={theme} />
              ) : (
                <div
                  className="flex min-h-[100px] flex-col items-center justify-center rounded-lg border px-3 py-6 text-center"
                  style={{ borderColor: `${theme.gold}44`, background: `${theme.primary}08` }}
                >
                  <SponsorBrandLogo theme={theme} logoUrl={form.logoUrl} size="sm" />
                  <p className="mt-3 text-xs font-bold leading-tight">{arenaName}</p>
                  {label === "Staff Shirts" ? (
                    <p className="mt-1 text-[10px] text-muted-foreground">{displayCompany} Crew</p>
                  ) : null}
                  {label === "VIP Badge" ? (
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-amber-400">All Access</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </FadeUpItem>
      ))}
    </FadeUpStagger>
  );
}
