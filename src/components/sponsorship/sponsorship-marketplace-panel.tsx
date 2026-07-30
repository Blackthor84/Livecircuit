"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  joinSponsorshipWaitingListAction,
  submitAuctionBidAction,
  withdrawWaitingListAction,
} from "@/lib/actions/sponsorship-marketplace";
import type { MarketplaceListing } from "@/lib/sponsorship/marketplace";
import type { SponsorBusinessProfile } from "@/lib/sponsorship/sponsor-profile";
import { FoundingPartnerBadge } from "@/components/sponsorship/founding-partner-program";
import { formatCents } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  available: "border-emerald-500/40 text-emerald-300",
  sold: "bg-primary/20",
  reserved: "border-amber-500/40 text-amber-300",
  expired: "text-muted-foreground",
  waiting_list: "border-violet-500/40 text-violet-300",
};

export function SponsorshipMarketplacePanel({
  listings,
  states,
  organizations,
}: {
  listings: MarketplaceListing[];
  states: string[];
  organizations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [stateFilter, setStateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [orgId, setOrgId] = useState(organizations[0]?.id ?? "");

  const filtered = listings.filter((l) => {
    if (stateFilter && l.stateCode !== stateFilter) return false;
    if (statusFilter && l.inventoryStatus !== statusFilter) return false;
    return true;
  });

  async function joinWaitlist(listing: MarketplaceListing) {
    if (!orgId) {
      toast.error("Select a sponsor organization first");
      return;
    }
    const email = prompt("Contact email for waiting list:");
    if (!email) return;
    const result = await joinSponsorshipWaitingListAction({
      organizationId: orgId,
      slotTypeSlug: listing.slotTypeSlug,
      venueId: listing.venueId,
      contactEmail: email,
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Added to waiting list");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        {organizations.length ? (
          <div className="space-y-1">
            <Label className="text-xs">Your organization</Label>
            <select
              className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            >
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-1">
          <Label className="text-xs">State</Label>
          <select
            className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="">All states</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <select
            className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
            <option value="waiting_list">Waiting list</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((l) => (
          <article key={`${l.slotTypeSlug}-${l.venueId ?? "platform"}`} className="glass-panel rounded-xl border border-white/10 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{l.slotName}</p>
                <p className="text-sm text-muted-foreground">{l.venueName ?? "Platform-wide"}</p>
                {l.city ? <p className="text-xs text-muted-foreground">{l.city}{l.stateCode ? `, ${l.stateCode}` : ""}</p> : null}
              </div>
              <Badge variant="outline" className={STATUS_COLORS[l.inventoryStatus] ?? ""}>
                {l.inventoryStatus.replace("_", " ")}
              </Badge>
            </div>
            {l.description ? <p className="mt-2 text-sm text-muted-foreground">{l.description}</p> : null}
            <p className="mt-3 text-lg font-semibold tabular-nums">
              {l.recommendedPriceCents ? formatCents(l.recommendedPriceCents) : "Contact sales"}
            </p>
            {l.capacity ? <p className="text-xs text-muted-foreground">Capacity: {l.capacity.toLocaleString()}</p> : null}
            {l.waitingListCount > 0 ? (
              <p className="mt-1 text-xs text-violet-300">{l.waitingListCount} on waiting list</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {l.inventoryStatus === "available" ? (
                <Button size="sm" href="/sponsor">Contact sales</Button>
              ) : l.inventoryStatus === "sold" || l.inventoryStatus === "waiting_list" ? (
                <Button size="sm" variant="secondary" onClick={() => void joinWaitlist(l)}>
                  Join waiting list
                </Button>
              ) : null}
              {l.auctionEnabled ? (
                <Badge variant="outline" className="text-xs">Auction eligible</Badge>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {!filtered.length ? (
        <p className="text-center text-muted-foreground">No listings match your filters.</p>
      ) : null}
    </div>
  );
}

export function SponsorBusinessProfilePanel({ profile }: { profile: SponsorBusinessProfile }) {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold">{profile.organization.name}</h3>
        {profile.isFoundingPartner ? <FoundingPartnerBadge /> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Sponsorship score" value={`${profile.sponsorScore.score}/100`} />
        <Stat label="Active contracts" value={String(profile.currentContracts.length)} />
        <Stat label="Active value" value={formatCents(profile.totalRevenueCents)} />
        <Stat label="Lifetime revenue" value={formatCents(profile.lifetimeRevenueCents)} />
        <Stat label="Renewal rate" value={`${profile.sponsorScore.renewalRatePercent}%`} />
      </div>

      {profile.upcomingRenewals.length > 0 ? (
        <section>
          <h3 className="font-semibold">Upcoming renewals</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {profile.upcomingRenewals.map((r) => (
              <li key={r.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                {r.displayLabel} · ends {r.contractEndsAt}
                {r.firstRightOfRenewalDays ? ` · ${r.firstRightOfRenewalDays}-day first right` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="font-semibold">Achievements</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {profile.achievements.filter((a) => a.earnedAt).map((a) => (
            <Badge key={a.slug} variant="outline" className="border-primary/30">{a.name}</Badge>
          ))}
          {!profile.achievements.some((a) => a.earnedAt) ? (
            <p className="text-sm text-muted-foreground">Complete sponsorships to earn achievements.</p>
          ) : null}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold">Current sponsorships</h3>
        <ul className="mt-3 space-y-2">
          {profile.currentContracts.map((c) => (
            <li key={c.id} className="glass-panel rounded-lg border border-white/10 p-3 text-sm">
              <p className="font-medium">{c.displayLabel}</p>
              <p className="text-muted-foreground">{c.slotName} · {formatCents(c.contractValueCents)} · {c.status}</p>
            </li>
          ))}
          {!profile.currentContracts.length ? <p className="text-sm text-muted-foreground">No active premium contracts.</p> : null}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold">Previous sponsorships</h3>
        <ul className="mt-3 space-y-2">
          {profile.previousContracts.map((c) => (
            <li key={c.id} className="rounded-lg border border-white/10 p-3 text-sm">
              {c.displayLabel} · {c.slotName} · ended {c.contractEndsAt ?? "—"}
            </li>
          ))}
          {!profile.previousContracts.length ? <p className="text-sm text-muted-foreground">No previous contracts.</p> : null}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold">Contract history & revenue</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {profile.priceHistory.map((h) => (
            <li key={h.id} className="flex justify-between gap-2 rounded-lg border border-white/10 p-3">
              <span>{h.sponsorName} · {h.slotName}</span>
              <span className="font-medium tabular-nums">{formatCents(h.contractValueCents)}</span>
            </li>
          ))}
          {!profile.priceHistory.length ? <p className="text-muted-foreground">No price history yet.</p> : null}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold">Your waiting lists</h3>
        <ul className="mt-3 space-y-2">
          {profile.waitingListEntries.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3 text-sm">
              <span>{e.slotName}{e.venueName ? ` · ${e.venueName}` : ""} · #{e.queuePosition}</span>
              <Button size="sm" variant="outline" onClick={async () => {
                const r = await withdrawWaitingListAction(e.id, profile.organization.id);
                if (!r.ok) toast.error(r.error);
                else router.refresh();
              }}>Withdraw</Button>
            </li>
          ))}
          {!profile.waitingListEntries.length ? <p className="text-sm text-muted-foreground">Not on any waiting lists.</p> : null}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold">Future opportunities</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {profile.availableOpportunities.slice(0, 6).map((o) => (
            <li key={`${o.slotTypeSlug}-${o.venueId}`} className="rounded-lg border border-white/10 p-3 text-sm">
              {o.slotName} · {o.venueName ?? "Platform"} · {o.recommendedPriceCents ? formatCents(o.recommendedPriceCents) : "—"}
            </li>
          ))}
        </ul>
        <Button className="mt-3" variant="secondary" href="/sponsor/marketplace">Browse marketplace</Button>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel rounded-xl border border-white/10 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
