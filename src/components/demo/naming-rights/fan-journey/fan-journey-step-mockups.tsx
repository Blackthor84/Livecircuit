"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Heart,
  MessageCircle,
  Search,
  Share2,
  Shield,
  Star,
  Ticket,
  Tv,
  Users,
} from "lucide-react";
import { SponsorBrandLogo } from "@/components/demo/naming-rights/sponsor-brand-logo";
import { TicketMockup } from "@/components/demo/naming-rights/ticket-mockup";
import type { FanJourneyStepId } from "@/lib/demo/fan-journey-data";
import type { BrandTheme } from "@/lib/demo/naming-rights-utils";
import { cn } from "@/lib/utils";

type MockupCtx = {
  stepId: FanJourneyStepId;
  companyName: string;
  arenaName: string;
  theme: BrandTheme;
  logoUrl?: string | null;
  eventLabel?: string;
};

export function FanJourneyStepMockups({ ctx, compact }: { ctx: MockupCtx; compact?: boolean }) {
  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2")}>{renderStepMockups(ctx)}</div>
  );
}

function renderStepMockups(ctx: MockupCtx) {
  const { stepId, companyName, arenaName, theme, logoUrl, eventLabel } = ctx;
  const presented = `Presented by ${companyName}`;
  const event = eventLabel ?? "Live Tonight";

  switch (stepId) {
    case "discovery":
      return (
        <>
          <MockCard label="Google Search">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Search className="size-3" />
                <span>Google</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-primary">{event} · {arenaName}</p>
              <p className="text-[10px] text-muted-foreground">livecircuit.com/events · {presented}</p>
            </div>
          </MockCard>
          <MockCard label="LiveCircuit Home Page" accent={theme.gradient}>
            <SponsorBrandLogo theme={theme} logoUrl={logoUrl} size="sm" className="mx-auto" />
            <p className="mt-2 text-[10px] font-semibold text-white">{arenaName}</p>
            <p className="text-[9px] text-white/70">{presented}</p>
          </MockCard>
          <MockCard label="Trending Events">
            <div className="flex items-center gap-2 text-left">
              <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">🔥 TRENDING</span>
              <p className="text-xs font-semibold">{event}</p>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">{presented}</p>
          </MockCard>
          <MockCard label="Featured Carousel">
            <div className="flex gap-2 overflow-hidden">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-14 w-20 shrink-0 rounded-lg border border-white/10 p-2"
                  style={{ background: n === 1 ? theme.gradient : `${theme.primary}22` }}
                >
                  <p className="text-[8px] font-bold text-white">{n === 1 ? companyName : "Event"}</p>
                </div>
              ))}
            </div>
          </MockCard>
          <MockCard label="Search Results">
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                <SponsorBrandLogo theme={theme} logoUrl={logoUrl} size="sm" />
                <div>
                  <p className="text-[10px] font-bold">{arenaName}</p>
                  <p className="text-[9px] text-amber-400">Sponsored · {event}</p>
                </div>
              </div>
            </div>
          </MockCard>
          <MockCard label="Social Media Ad">
            <div className="rounded-lg p-3 text-left" style={{ background: theme.gradient }}>
              <p className="text-[10px] font-bold text-white">{event}</p>
              <p className="mt-1 text-[9px] text-white/80">{presented}</p>
              <p className="mt-2 rounded bg-white/20 px-2 py-1 text-center text-[9px] font-semibold text-white">
                Get Tickets
              </p>
            </div>
          </MockCard>
        </>
      );

    case "event-page":
      return (
        <>
          <MockCard label="Hero Banner" accent={theme.gradient} className="sm:col-span-2">
            <p className="text-lg font-bold text-white">{arenaName}</p>
            <p className="text-sm text-white/80">{event}</p>
            <p className="mt-2 text-xs text-white/70">Presented by {companyName}</p>
          </MockCard>
          <MockCard label="Arena Header">
            <div className="flex items-center justify-between">
              <SponsorBrandLogo theme={theme} logoUrl={logoUrl} size="sm" />
              <p className="text-xs font-bold">{arenaName}</p>
            </div>
          </MockCard>
          <MockCard label="Event Information">
            <p className="text-xs font-semibold">{event}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Sat 8:00 PM · Digital Arena</p>
          </MockCard>
          <MockCard label="Upcoming Shows">
            <div className="space-y-1 text-left text-[10px]">
              <p>→ Comedy Night · Fri</p>
              <p>→ {event} · Sat</p>
            </div>
          </MockCard>
        </>
      );

    case "ticket-purchase":
      return (
        <>
          <MockCard label="Checkout Page">
            <p className="text-xs font-semibold">{event} · 2 tickets</p>
            <p className="mt-2 text-lg font-bold" style={{ color: theme.gold }}>$178.00</p>
            <div className="mt-2 flex items-center justify-center gap-1 text-[9px] text-emerald-400">
              <Shield className="size-3" />
              Secured by {companyName}
            </div>
          </MockCard>
          <MockCard label="Seat Selection">
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "size-5 rounded text-[7px] leading-5",
                    i === 3 || i === 4 ? "bg-primary text-white" : "bg-white/10"
                  )}
                />
              ))}
            </div>
            <p className="mt-2 text-[9px] text-muted-foreground">Section A · Row 12</p>
          </MockCard>
          <MockCard label="Digital Ticket">
            <div className="scale-90 origin-top">
              <TicketMockup companyName={companyName} arenaName={arenaName} theme={theme} compact />
            </div>
          </MockCard>
          <MockCard label="QR Code">
            <div className="mx-auto flex size-16 items-center justify-center rounded-lg border-2 border-white/20 bg-white p-1">
              <Ticket className="size-8 text-neutral-900" />
            </div>
            <p className="mt-2 text-[9px]">{arenaName}</p>
          </MockCard>
          <MockCard label="Confirmation">
            <p className="text-emerald-400">✓ Purchase confirmed</p>
            <p className="mt-1 text-[10px]">{presented}</p>
          </MockCard>
        </>
      );

    case "email-confirmation":
      return (
        <MockCard label="Email Preview" className="sm:col-span-2">
          <div className="overflow-hidden rounded-lg border border-white/10 bg-background text-left">
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: theme.gradient }}>
              <SponsorBrandLogo theme={theme} logoUrl={logoUrl} size="sm" />
              <p className="text-xs font-semibold text-white">Your tickets for {event}</p>
            </div>
            <div className="space-y-3 p-4 text-[11px]">
              <p><strong>{arenaName}</strong></p>
              <p className="text-muted-foreground">Presented by {companyName}</p>
              <button type="button" className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2">
                <Calendar className="size-3.5" style={{ color: theme.primary }} />
                Add to Calendar
              </button>
              <div className="rounded border border-white/10 p-2">
                <p className="font-semibold">Recommended Events</p>
                <p className="text-muted-foreground">More at {arenaName}</p>
              </div>
            </div>
          </div>
        </MockCard>
      );

    case "push-notification":
      return (
        <MockCard label="Push Notification" className="sm:col-span-2">
          <div className="mx-auto max-w-xs rounded-2xl border border-white/10 bg-neutral-900/80 p-4 text-left shadow-xl backdrop-blur">
            <div className="flex items-center gap-2">
              <SponsorBrandLogo theme={theme} logoUrl={logoUrl} size="sm" />
              <p className="text-[9px] text-muted-foreground">LiveCircuit · now</p>
            </div>
            <p className="mt-2 text-sm font-semibold">Your concert at</p>
            <p className="text-sm font-bold" style={{ color: theme.gold }}>{arenaName}</p>
            <p className="mt-1 text-xs text-muted-foreground">starts in one hour</p>
          </div>
        </MockCard>
      );

    case "entering-arena":
      return (
        <MockCard label="Digital Arena Entrance" className="sm:col-span-2">
          <motion.div className="relative overflow-hidden rounded-xl bg-neutral-950 py-10">
            <motion.div
              className="mx-auto flex max-w-sm justify-center gap-3"
              initial={{ scaleX: 0.2, opacity: 0 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                className="h-28 w-12 rounded-l-xl border-2 border-amber-500/50"
                style={{ background: `linear-gradient(90deg, ${theme.primary}44, transparent)` }}
                animate={{ x: [-4, 0, -4] }}
                transition={{ repeat: Infinity, duration: 3 }}
              />
              <div className="flex flex-col items-center justify-center px-3">
                <SponsorBrandLogo theme={theme} logoUrl={logoUrl} size="md" />
                <p className="mt-2 text-sm font-bold">{arenaName}</p>
                <motion.p
                  className="font-mono text-2xl font-bold text-primary"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  00:59:42
                </motion.p>
                <p className="mt-1 text-[10px] text-emerald-400">Welcome · {companyName}</p>
              </div>
              <motion.div
                className="h-28 w-12 rounded-r-xl border-2 border-amber-500/50"
                style={{ background: `linear-gradient(270deg, ${theme.primary}44, transparent)` }}
                animate={{ x: [4, 0, 4] }}
                transition={{ repeat: Infinity, duration: 3 }}
              />
            </motion.div>
            <div className="mt-4 flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Users key={i} className="size-4 text-muted-foreground/50" />
              ))}
            </div>
          </motion.div>
        </MockCard>
      );

    case "pre-show":
      return (
        <>
          <MockCard label="Countdown">
            <p className="font-mono text-3xl font-bold text-primary">00:08:42</p>
          </MockCard>
          <MockCard label="Sponsor Animation" accent={theme.gradient}>
            <motion.p
              className="text-sm font-bold text-white"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {companyName}
            </motion.p>
          </MockCard>
          <MockCard label="Arena Introduction">
            <p className="text-xs">Welcome to {arenaName}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{presented}</p>
          </MockCard>
          <MockCard label="Sponsor Video">
            <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 py-4">
              <Tv className="size-5" style={{ color: theme.primary }} />
              <p className="text-[10px]">Featured partner content</p>
            </div>
          </MockCard>
        </>
      );

    case "live-performance":
      return (
        <>
          <MockCard label="Stage LEDs" accent={theme.gradient} className="sm:col-span-2">
            <p className="text-xl font-bold text-white">{companyName}</p>
            <p className="text-sm text-white/70">{arenaName} · LIVE</p>
          </MockCard>
          <MockCard label="Livestream Overlay">
            <div className="relative rounded-lg bg-neutral-900 py-6">
              <p className="text-xs font-semibold">{event}</p>
              <div className="absolute bottom-2 left-2 rounded px-2 py-0.5 text-[9px]" style={{ background: theme.primary }}>
                {presented}
              </div>
            </div>
          </MockCard>
          <MockCard label="Scoreboard">
            <p className="font-mono text-2xl font-bold">12,847</p>
            <p className="text-[9px] text-muted-foreground">fans watching live</p>
          </MockCard>
          <MockCard label="Lower Thirds">
            <div className="rounded px-3 py-1.5 text-[10px] font-semibold text-white" style={{ background: theme.gradient }}>
              {presented}
            </div>
          </MockCard>
        </>
      );

    case "fan-engagement":
      return (
        <>
          <MockCard label="Live Chat" className="sm:col-span-2">
            <div className="rounded-lg border border-white/10 text-left text-[10px]">
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 font-semibold" style={{ color: theme.gold }}>
                <MessageCircle className="size-3" />
                {companyName} · Official Partner
              </div>
              <div className="space-y-1 p-3">
                <p>fan_alex: 🔥🔥🔥</p>
                <p>fan_sam: Best show ever!</p>
              </div>
            </div>
          </MockCard>
          <MockCard label="Polls & Trivia">
            <p className="text-xs font-semibold">Who should encore?</p>
            <div className="mt-2 space-y-1">
              <div className="h-2 rounded-full bg-white/10"><div className="h-full w-3/4 rounded-full bg-primary" /></div>
              <div className="h-2 rounded-full bg-white/10"><div className="h-full w-1/2 rounded-full bg-primary/60" /></div>
            </div>
          </MockCard>
          <MockCard label="Virtual Gifts">
            <div className="flex justify-center gap-2 text-2xl">
              <span>🎁</span><span>💎</span><span>⭐</span>
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">Powered by {companyName}</p>
          </MockCard>
        </>
      );

    case "vip-experience":
      return (
        <>
          <MockCard label="VIP Lounge" accent={`linear-gradient(135deg, ${theme.primary}33, oklch(0.15 0.02 280))`}>
            <p className="text-xs font-bold text-amber-400">VIP LOUNGE</p>
            <p className="mt-1 text-[10px]">{presented}</p>
          </MockCard>
          <MockCard label="Meet & Greet">
            <Heart className="mx-auto size-6 text-red-400" />
            <p className="mt-2 text-[10px]">Exclusive access</p>
          </MockCard>
          <MockCard label="Backstage Access">
            <p className="text-2xl">🎟️</p>
            <p className="mt-1 text-[10px] font-bold">ALL ACCESS</p>
          </MockCard>
          <MockCard label="Exclusive Offers">
            <p className="text-xs font-semibold" style={{ color: theme.gold }}>20% off next event</p>
            <p className="text-[9px] text-muted-foreground">{companyName} partners only</p>
          </MockCard>
        </>
      );

    case "post-show":
      return (
        <>
          <MockCard label="Thank You" accent={theme.gradient}>
            <p className="text-sm font-bold text-white">Thank you for attending!</p>
            <p className="mt-1 text-[10px] text-white/70">— {companyName}</p>
          </MockCard>
          <MockCard label="Rate Event">
            <div className="flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className="size-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </MockCard>
          <MockCard label="Recommended Artists">
            <p className="text-xs font-semibold">Similar artists near you</p>
            <p className="mt-1 text-[10px] text-muted-foreground">At {arenaName}</p>
          </MockCard>
        </>
      );

    case "social-sharing":
      return ["Instagram", "TikTok", "Facebook", "LinkedIn", "X"].map((platform) => (
        <MockCard key={platform} label={platform}>
          <div className="rounded-lg p-2 text-left" style={{ background: `${theme.primary}18` }}>
            <Share2 className="size-4" style={{ color: theme.primary }} />
            <p className="mt-2 text-[10px] font-semibold">{event}</p>
            <p className="text-[9px] text-muted-foreground">Presented at {arenaName}</p>
          </div>
        </MockCard>
      ));

    case "return-visit":
      return ["One Week Later", "Next Month", "Music Festival", "Holiday Event"].map((label, i) => (
        <MockCard key={label} label={label}>
          <p className="text-xs font-semibold">{["Comedy Show", "Podcast Live", "Summer Fest", "Holiday Special"][i]}</p>
          <p className="mt-1 text-[10px]" style={{ color: theme.gold }}>{arenaName}</p>
          <p className="text-[9px] text-emerald-400">+{[12, 28, 45, 67][i]}% cumulative exposure</p>
        </MockCard>
      ));

    default:
      return null;
  }
}

function MockCard({
  label,
  children,
  accent,
  className,
}: {
  label: string;
  children: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-xl border border-white/10 p-4 text-center backdrop-blur-sm", className)}
      style={accent ? { background: accent } : { background: "oklch(0.12 0.02 280 / 0.65)" }}
    >
      <p className="mb-3 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
