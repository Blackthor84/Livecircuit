"use client";

import { MobileAppPreview } from "@/components/demo/naming-rights/mobile-app-preview";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { TicketMockup } from "@/components/demo/naming-rights/ticket-mockup";
import type { DigitalPlacementId } from "@/lib/demo/digital-sponsorship-placements";
import type { BrandTheme } from "@/lib/demo/naming-rights-utils";
import { cn } from "@/lib/utils";

export function DigitalPlacementMockup({
  placementId,
  label,
  companyName,
  arenaName,
  theme,
  logoUrl,
  slogan,
  compact,
  className,
}: {
  placementId?: DigitalPlacementId;
  label: string;
  companyName: string;
  arenaName: string;
  theme: BrandTheme;
  logoUrl?: string | null;
  slogan?: string;
  compact?: boolean;
  className?: string;
}) {
  const id = placementId ?? labelToId(label);

  if (id === "digital-tickets") {
    return (
      <div className={cn("origin-top scale-[0.9]", className)}>
        <TicketMockup companyName={companyName} arenaName={arenaName} theme={theme} compact={compact} />
      </div>
    );
  }

  if (id === "mobile-app") {
    return (
      <div className={cn("origin-top scale-[0.75]", className)}>
        <MobileAppPreview companyName={companyName} arenaName={arenaName} theme={theme} />
      </div>
    );
  }

  return <div className={cn("flex min-h-[100px] flex-col", className)}>{renderPreview(id, { companyName, arenaName, theme, logoUrl, slogan })}</div>;
}

function labelToId(label: string): DigitalPlacementId {
  const map: Record<string, DigitalPlacementId> = {
    "Search Results": "search-results",
    "Arena Entrance": "arena-entrance",
    "Arena Homepage": "arena-homepage",
    "Event Listing": "event-listing",
    "Digital Tickets": "digital-tickets",
    "Mobile App": "mobile-app",
    "Livestream Overlay": "livestream-overlay",
    "Stage LED Screens": "stage-led",
    "Virtual Lobby": "virtual-lobby",
    "VIP Lounge": "vip-lounge",
    "Chat Branding": "chat-branding",
    "Push Notifications": "push-notifications",
    "Email Campaigns": "email-campaigns",
    "Digital Merchandise": "digital-merchandise",
    "Profile Frames": "profile-frames",
    "Analytics Dashboard": "analytics-dashboard",
  };
  return map[label] ?? "arena-homepage";
}

function renderPreview(
  id: DigitalPlacementId,
  ctx: {
    companyName: string;
    arenaName: string;
    theme: BrandTheme;
    logoUrl?: string | null;
    slogan?: string;
  }
) {
  const { companyName, arenaName, theme, logoUrl, slogan } = ctx;

  switch (id) {
    case "search-results":
      return (
        <div className="space-y-2 rounded-lg border border-white/10 bg-background p-3 text-left">
          <p className="text-[10px] text-muted-foreground">livecircuit.com/search</p>
          <p className="text-xs font-semibold text-primary">{arenaName}</p>
          <p className="text-[10px] text-muted-foreground">Sponsored · Presented by {companyName}</p>
        </div>
      );
    case "arena-entrance":
      return (
        <div className="rounded-lg border-2 px-4 py-6 text-center" style={{ borderColor: theme.gold, background: "oklch(0.08 0.02 280)" }}>
          <SponsorBrandLogo theme={theme} logoUrl={logoUrl} size="sm" className="mx-auto" />
          <p className="mt-3 text-sm font-bold">{arenaName}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Welcome · {companyName}</p>
        </div>
      );
    case "arena-homepage":
      return (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <div className="px-3 py-4 text-center" style={{ background: theme.gradient }}>
            <p className="text-[10px] font-semibold text-white">{arenaName}</p>
            <p className="text-[9px] text-white/70">Presented by {companyName}</p>
          </div>
          <div className="space-y-1 bg-background p-3">
            <div className="h-2 w-3/4 rounded bg-white/10" />
            <div className="h-2 w-1/2 rounded bg-white/5" />
          </div>
        </div>
      );
    case "event-listing":
      return (
        <div className="rounded-lg px-4 py-5 text-center" style={{ background: `linear-gradient(135deg, ${theme.primary}30, oklch(0.12 0.02 280))` }}>
          <p className="text-sm font-bold">Comedy Night Live</p>
          <p className="mt-2 text-[10px]" style={{ color: theme.gold }}>Presented by {companyName}</p>
        </div>
      );
    case "livestream-overlay":
      return (
        <div className="relative overflow-hidden rounded-lg bg-neutral-950 p-4">
          <div className="aspect-video rounded bg-neutral-900" />
          <div className="absolute bottom-3 left-3 rounded px-2 py-1 text-[9px] font-semibold" style={{ background: theme.primary }}>
            {companyName}
          </div>
          <p className="absolute top-3 right-3 text-[9px] text-red-400">● LIVE</p>
        </div>
      );
    case "stage-led":
      return (
        <div className="rounded-lg p-6 text-center font-mono" style={{ background: theme.gradient }}>
          <p className="text-lg font-bold text-white">{companyName}</p>
          <p className="mt-1 text-[10px] text-white/70">Stage LED · {arenaName}</p>
        </div>
      );
    case "virtual-lobby":
      return (
        <div className="rounded-lg border border-white/10 bg-card/80 p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Virtual Lobby</p>
          <p className="mt-2 text-xs font-semibold">Show starts in 12:34</p>
          <p className="mt-2 text-[10px]" style={{ color: theme.gold }}>Brought to you by {companyName}</p>
        </div>
      );
    case "vip-lounge":
      return (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <SponsorBrandLogo theme={theme} logoUrl={logoUrl} size="sm" />
          <div className="text-left">
            <p className="text-xs font-bold text-amber-400">VIP LOUNGE</p>
            <p className="text-[10px] text-muted-foreground">Presented by {companyName}</p>
          </div>
        </div>
      );
    case "chat-branding":
      return (
        <div className="space-y-2 rounded-lg border border-white/10 p-3 text-left text-[10px]">
          <p><span className="rounded bg-primary/30 px-1 py-0.5 text-primary">{companyName}</span> Official Partner</p>
          <p className="text-muted-foreground">fan_alex: This stream is 🔥</p>
          <p className="text-muted-foreground">fan_sam: Shoutout {companyName}!</p>
        </div>
      );
    case "push-notifications":
      return (
        <div className="rounded-xl border border-white/10 bg-neutral-900 p-3 text-left">
          <p className="text-[9px] text-muted-foreground">LiveCircuit · now</p>
          <p className="mt-1 text-xs font-semibold">Show at {arenaName} starts soon!</p>
          <p className="text-[10px] text-muted-foreground">Presented by {companyName}</p>
        </div>
      );
    case "email-campaigns":
      return (
        <div className="rounded-lg border border-white/10 p-4 text-left">
          <p className="text-[10px] text-muted-foreground">Subject</p>
          <p className="text-xs font-semibold">Your tickets for {arenaName}</p>
          <p className="mt-2 text-[10px]" style={{ color: theme.gold }}>Sponsored by {companyName}</p>
        </div>
      );
    case "digital-merchandise":
      return (
        <div className="rounded-lg border border-white/10 p-4 text-center">
          <p className="text-2xl">👕</p>
          <p className="mt-2 text-xs font-semibold">{companyName} × {arenaName}</p>
          <p className="text-[10px] text-muted-foreground">Limited digital drop</p>
        </div>
      );
    case "profile-frames":
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full p-1" style={{ background: theme.gradient }}>
            <div className="flex size-12 items-center justify-center rounded-full bg-background text-lg">🎤</div>
          </div>
          <p className="text-[10px] text-muted-foreground">{companyName} frame</p>
        </div>
      );
    case "analytics-dashboard":
      return (
        <div className="space-y-2 rounded-lg bg-neutral-950 p-3 font-mono text-left text-[10px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Impressions</span><span className="text-emerald-400">2.4M</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">CTR</span><span>4.8%</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[72%] rounded-full" style={{ background: theme.primary }} />
          </div>
        </div>
      );
    default:
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border px-3 py-6 text-center" style={{ borderColor: `${theme.gold}44`, background: `${theme.primary}08` }}>
          <SponsorBrandLogo theme={theme} logoUrl={logoUrl} size="sm" />
          <p className="mt-3 text-xs font-bold">{arenaName}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">{slogan || companyName}</p>
        </div>
      );
  }
}
