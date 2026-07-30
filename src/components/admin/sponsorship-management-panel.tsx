"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  expirePremiumSponsorshipAction,
  upsertPremiumSponsorshipAction,
} from "@/lib/actions/sponsorship-admin";
import type { PremiumSponsorshipContract } from "@/lib/sponsorship/inventory";
import type { SponsorshipRevenueSummary } from "@/lib/sponsorship/revenue";
import { formatCents } from "@/lib/format";
import { NON_INVENTORY_EXAMPLES } from "@/lib/sponsorship/constants";

type Org = { id: string; name: string };

export function SponsorshipManagementPanel({
  contracts,
  revenue,
  organizations,
  venueOptions,
}: {
  contracts: PremiumSponsorshipContract[];
  revenue: SponsorshipRevenueSummary;
  organizations: Org[];
  venueOptions: { id: string; default_name: string; region: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [slotSlug, setSlotSlug] = useState("official_arena_partner");
  const [venueId, setVenueId] = useState("");
  const [orgId, setOrgId] = useState("");

  async function assignContract(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const result = await upsertPremiumSponsorshipAction({
      slotTypeSlug: String(fd.get("slotTypeSlug")),
      venueId: String(fd.get("venueId") || "") || null,
      organizationId: String(fd.get("organizationId") || "") || null,
      displayLabel: String(fd.get("displayLabel")),
      contractValueCents: Number(fd.get("contractValueCents") || 0),
      contractStartsAt: String(fd.get("contractStartsAt") || "") || null,
      contractEndsAt: String(fd.get("contractEndsAt") || "") || null,
      status: "active",
    });
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Sponsorship contract assigned");
      router.refresh();
    }
  }

  async function expire(id: string) {
    setBusy(true);
    const result = await expirePremiumSponsorshipAction(id);
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Contract expired — inventory available");
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active contract value" value={formatCents(revenue.totalActiveValueCents)} />
        <Stat label="Active contracts" value={String(revenue.totalActiveContracts)} />
        <Stat label="Unsold platform slots" value={String(revenue.unsoldPlatformSlots)} />
        <Stat label="Unsold venue slots (est.)" value={String(revenue.unsoldVenueSlotEstimate)} />
      </div>

      <section className="glass-panel rounded-xl border border-white/10 p-6">
        <h3 className="font-semibold">Assign exclusive sponsorship</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Each slot allows only one active sponsor. Scarcity drives premium value.
        </p>
        <form onSubmit={(e) => void assignContract(e)} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Slot type</Label>
            <select
              name="slotTypeSlug"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={slotSlug}
              onChange={(e) => setSlotSlug(e.target.value)}
            >
              <option value="arena_naming_rights">Arena Naming Rights</option>
              <option value="official_arena_partner">Official Arena Partner</option>
              <option value="vip_lounge">VIP Lounge</option>
              <option value="artist_green_room">Artist Green Room</option>
              <option value="fan_zone">Fan Zone</option>
              <option value="wifi">WiFi Sponsor</option>
              <option value="tour_sponsor">Tour Sponsor</option>
              <option value="livestream">Livestream Sponsor</option>
              <option value="platform_official_streaming">Platform Streaming Partner</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Venue (venue-scoped slots)</Label>
            <select
              name="venueId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
            >
              <option value="">— Platform / tour / event —</option>
              {venueOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.default_name} ({v.region})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Sponsor organization</Label>
            <select
              name="organizationId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
            >
              <option value="">— Optional —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Display label</Label>
            <Input name="displayLabel" placeholder="Spotify Boston Stadium" required />
          </div>
          <div className="space-y-2">
            <Label>Contract value (cents)</Label>
            <Input name="contractValueCents" type="number" min={0} defaultValue={2500000} />
          </div>
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input name="contractStartsAt" type="date" />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <Input name="contractEndsAt" type="date" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              Assign sponsorship
            </Button>
          </div>
        </form>
      </section>

      <section className="glass-panel rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
        <h3 className="font-semibold text-amber-100">What we do not sell</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          The platform stays premium — no logo flooding, no popup ads, no chat sponsorships.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {NON_INVENTORY_EXAMPLES.map((item) => (
            <Badge key={item} variant="outline" className="text-xs">
              {item}
            </Badge>
          ))}
        </ul>
      </section>

      {revenue.expiringSoon.length > 0 ? (
        <section className="glass-panel rounded-xl border border-white/10 p-6">
          <h3 className="font-semibold">Renewal reminders ({revenue.expiringSoon.length})</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {revenue.expiringSoon.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3">
                <span>
                  {row.displayLabel} · {row.slotName}
                  {row.venueName ? ` · ${row.venueName}` : ""}
                </span>
                <span className="text-amber-300">Ends {row.endsAt}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="glass-panel rounded-xl border border-white/10 p-6">
        <h3 className="font-semibold">All contracts</h3>
        <ul className="mt-4 space-y-3">
          {contracts.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 rounded-xl border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{c.displayLabel}</p>
                <p className="text-sm text-muted-foreground">
                  {c.slotName} · {c.organizationName ?? "No org"} · {formatCents(c.contractValueCents)}
                </p>
                <Badge variant="outline" className="mt-1">
                  {c.status}
                </Badge>
              </div>
              {c.status === "active" ? (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void expire(c.id)}>
                  Expire / release slot
                </Button>
              ) : null}
            </li>
          ))}
          {!contracts.length ? (
            <p className="text-sm text-muted-foreground">No premium contracts yet.</p>
          ) : null}
        </ul>
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
