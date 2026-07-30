"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  activatePremiumSponsorshipAction,
  cancelPremiumSponsorshipAction,
  closeSponsorshipAuctionAction,
  convertWaitingListAction,
  createSponsorshipAuctionAction,
  createSponsorshipSlotTypeAction,
  expirePremiumSponsorshipAction,
  getAiPriceRecommendationAction,
  removeFromWaitingListAction,
  respondToBidAction,
  savePremiumContractAction,
} from "@/lib/actions/sponsorship-admin";
import type { SponsorshipBusinessContract } from "@/lib/sponsorship/contracts";
import type { SponsorshipAnalyticsDashboard } from "@/lib/sponsorship/analytics";
import type { WaitingListEntry } from "@/lib/sponsorship/waiting-list";
import type { SponsorshipAuction, SponsorshipBid } from "@/lib/sponsorship/auctions";
import type { PriceHistoryEntry } from "@/lib/sponsorship/price-history";
import {
  CONTRACT_LENGTH_MONTHS,
  CONTRACT_LENGTH_LABELS,
  NON_INVENTORY_EXAMPLES,
  PAYMENT_FREQUENCY_OPTIONS,
} from "@/lib/sponsorship/constants";
import { SponsorshipPipelinePanel } from "@/components/admin/sponsorship-pipeline-panel";
import { FIRST_RIGHT_RENEWAL_DAYS } from "@/lib/sponsorship/program-constants";
import type { PipelineDeal } from "@/lib/sponsorship/pipeline";
import { formatCents } from "@/lib/format";

type Org = { id: string; name: string };
type VenueOpt = { id: string; default_name: string; region: string };

export function SponsorshipAdminHub({
  contracts,
  analytics,
  waitingList,
  auctions,
  auctionBids,
  priceHistory,
  pipelineDeals,
  organizations,
  venueOptions,
}: {
  contracts: SponsorshipBusinessContract[];
  analytics: SponsorshipAnalyticsDashboard;
  waitingList: WaitingListEntry[];
  auctions: SponsorshipAuction[];
  auctionBids: Record<string, SponsorshipBid[]>;
  priceHistory: PriceHistoryEntry[];
  pipelineDeals: PipelineDeal[];
  organizations: Org[];
  venueOptions: VenueOpt[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [aiPrice, setAiPrice] = useState<number | null>(null);

  async function saveContract(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const result = await savePremiumContractAction({
      slotTypeSlug: String(fd.get("slotTypeSlug")),
      venueId: String(fd.get("venueId") || "") || null,
      organizationId: String(fd.get("organizationId") || "") || null,
      displayLabel: String(fd.get("displayLabel")),
      logoUrl: String(fd.get("logoUrl") || "") || null,
      sponsorWebsite: String(fd.get("sponsorWebsite") || "") || null,
      contractValueCents: Number(fd.get("contractValueCents") || 0),
      contractLengthMonths: Number(fd.get("contractLengthMonths") || 12),
      customContractLength: fd.get("customContractLength") === "on",
      paymentFrequency: String(fd.get("paymentFrequency")),
      customPaymentPlan: String(fd.get("customPaymentPlan") || "") || null,
      contractStartsAt: String(fd.get("contractStartsAt") || "") || null,
      contractEndsAt: String(fd.get("contractEndsAt") || "") || null,
      autoRenew: fd.get("autoRenew") === "on",
      contactName: String(fd.get("contactName") || "") || null,
      contactEmail: String(fd.get("contactEmail") || "") || null,
      contactPhone: String(fd.get("contactPhone") || "") || null,
      notes: String(fd.get("notes") || "") || null,
      aiRecommendedPriceCents: aiPrice,
      aiPriceAccepted: aiPrice ? fd.get("aiPriceAccepted") === "on" : null,
      firstRightOfRenewalDays: Number(fd.get("firstRightOfRenewalDays") || 0) || null,
      status: String(fd.get("status") || "pending"),
    });
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Contract saved");
      router.refresh();
    }
  }

  async function fetchAiPrice(slotSlug: string, venueId: string) {
    const result = await getAiPriceRecommendationAction({
      slotTypeSlug: slotSlug,
      venueId: venueId || null,
    });
    if ("ok" in result && result.ok && "recommendation" in result) {
      setAiPrice(result.recommendation.recommendedPriceCents);
      toast.success(`AI recommends ${formatCents(result.recommendation.recommendedPriceCents)} (${result.recommendation.confidence} confidence)`);
    } else if ("error" in result) toast.error(result.error);
  }

  return (
    <Tabs defaultValue="contracts" className="space-y-6">
      <TabsList className="flex h-auto flex-wrap gap-1">
        <TabsTrigger value="contracts">Contracts</TabsTrigger>
        <TabsTrigger value="inventory">Inventory</TabsTrigger>
        <TabsTrigger value="waiting">Waiting list ({waitingList.length})</TabsTrigger>
        <TabsTrigger value="auctions">Auctions ({auctions.length})</TabsTrigger>
        <TabsTrigger value="history">Price history</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="pipeline">CRM ({pipelineDeals.length})</TabsTrigger>
        <TabsTrigger value="slot-types">Slot types</TabsTrigger>
      </TabsList>

      <TabsContent value="analytics">
        <AnalyticsGrid analytics={analytics} />
      </TabsContent>

      <TabsContent value="contracts" className="space-y-6">
        <form onSubmit={(e) => void saveContract(e)} className="glass-panel space-y-4 rounded-xl border border-white/10 p-6">
          <h3 className="font-semibold">Create sponsorship contract</h3>
          <p className="text-sm text-muted-foreground">Every sponsorship is a real business contract with full terms.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Sponsorship type">
              <select name="slotTypeSlug" className={selectClass} defaultValue="official_arena_partner">
                <option value="arena_naming_rights">Arena Naming Rights</option>
                <option value="official_arena_partner">Official Arena Partner</option>
                <option value="vip_lounge">VIP Lounge</option>
                <option value="artist_green_room">Artist Green Room</option>
                <option value="fan_zone">Fan Zone</option>
                <option value="wifi">WiFi Sponsor</option>
                <option value="livestream">Livestream Sponsor</option>
                <option value="tour_sponsor">Tour Sponsor</option>
                <option value="platform_official_streaming">Platform Streaming Partner</option>
              </select>
            </Field>
            <Field label="Arena">
              <select name="venueId" className={selectClass}>
                <option value="">— Platform / tour / event —</option>
                {venueOptions.map((v) => (
                  <option key={v.id} value={v.id}>{v.default_name} ({v.region})</option>
                ))}
              </select>
            </Field>
            <Field label="Sponsor organization">
              <select name="organizationId" className={selectClass}>
                <option value="">— Select —</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Sponsor display name"><Input name="displayLabel" required placeholder="Spotify Boston Stadium" /></Field>
            <Field label="Logo URL"><Input name="logoUrl" type="url" placeholder="https://..." /></Field>
            <Field label="Website"><Input name="sponsorWebsite" type="url" placeholder="https://..." /></Field>
            <Field label="Contract value (cents)"><Input name="contractValueCents" type="number" min={0} defaultValue={aiPrice ?? 2500000} /></Field>
            <Field label="Contract length">
              <select name="contractLengthMonths" className={selectClass} defaultValue={12}>
                {CONTRACT_LENGTH_MONTHS.map((m) => (
                  <option key={m} value={m}>{CONTRACT_LENGTH_LABELS[m]}</option>
                ))}
              </select>
            </Field>
            <Field label="Custom length">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="customContractLength" /> Custom contract length
              </label>
            </Field>
            <Field label="Payment frequency">
              <select name="paymentFrequency" className={selectClass} defaultValue="annual">
                {PAYMENT_FREQUENCY_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Custom payment plan"><Input name="customPaymentPlan" placeholder="Optional custom terms" /></Field>
            <Field label="Start date"><Input name="contractStartsAt" type="date" /></Field>
            <Field label="End date"><Input name="contractEndsAt" type="date" /></Field>
            <Field label="Contact name"><Input name="contactName" /></Field>
            <Field label="Contact email"><Input name="contactEmail" type="email" /></Field>
            <Field label="Contact phone"><Input name="contactPhone" type="tel" /></Field>
            <Field label="Status">
              <select name="status" className={selectClass} defaultValue="pending">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="reserved">Reserved</option>
              </select>
            </Field>
            <Field label="First right of renewal">
              <select name="firstRightOfRenewalDays" className={selectClass} defaultValue="">
                <option value="">None</option>
                {FIRST_RIGHT_RENEWAL_DAYS.map((d) => (
                  <option key={d} value={d}>{d} days exclusive window</option>
                ))}
              </select>
            </Field>
            <Field label="Auto-renew">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="autoRenew" /> Enable auto-renewal
              </label>
            </Field>
            {aiPrice ? (
              <Field label="Accept AI price">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="aiPriceAccepted" defaultChecked /> Accept {formatCents(aiPrice)}
                </label>
              </Field>
            ) : null}
          </div>
          <Field label="Notes"><Input name="notes" placeholder="Internal contract notes" /></Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>Save contract</Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => {
              const form = document.querySelector("form") as HTMLFormElement | null;
              const slot = (form?.querySelector("[name=slotTypeSlug]") as HTMLSelectElement)?.value;
              const venue = (form?.querySelector("[name=venueId]") as HTMLSelectElement)?.value;
              void fetchAiPrice(slot, venue);
            }}>
              Get AI price recommendation
            </Button>
          </div>
        </form>

        <ContractList contracts={contracts} busy={busy} setBusy={setBusy} onRefresh={() => router.refresh()} />
      </TabsContent>

      <TabsContent value="inventory">
        <InventoryOverview contracts={contracts} waitingList={waitingList} />
      </TabsContent>

      <TabsContent value="waiting">
        <WaitingListPanel
          entries={waitingList}
          busy={busy}
          setBusy={setBusy}
          onRefresh={() => router.refresh()}
        />
      </TabsContent>

      <TabsContent value="auctions" className="space-y-6">
        <AuctionPanel
          auctions={auctions}
          auctionBids={auctionBids}
          venueOptions={venueOptions}
          busy={busy}
          setBusy={setBusy}
          onRefresh={() => router.refresh()}
        />
      </TabsContent>

      <TabsContent value="history">
        <PriceHistoryPanel entries={priceHistory} />
      </TabsContent>

      <TabsContent value="pipeline">
        <SponsorshipPipelinePanel deals={pipelineDeals} />
      </TabsContent>

      <TabsContent value="slot-types">
        <SlotTypePanel busy={busy} setBusy={setBusy} onRefresh={() => router.refresh()} />
      </TabsContent>
    </Tabs>
  );
}

const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function AnalyticsGrid({ analytics }: { analytics: SponsorshipAnalyticsDashboard }) {
  const stats = [
    { label: "Today's revenue", value: formatCents(analytics.todayRevenueCents) },
    { label: "Monthly revenue", value: formatCents(analytics.monthlyRevenueCents) },
    { label: "Annual revenue", value: formatCents(analytics.annualRevenueCents) },
    { label: "Lifetime revenue", value: formatCents(analytics.lifetimeRevenueCents) },
    { label: "Avg contract value", value: formatCents(analytics.averageContractValueCents) },
    { label: "Largest sale", value: analytics.largestSaleCents ? formatCents(analytics.largestSaleCents) : "—" },
    { label: "Renewal rate", value: `${analytics.renewalRatePercent}%` },
    { label: "Occupancy rate", value: `${analytics.occupancyRatePercent}%` },
    { label: "Projected annual", value: formatCents(analytics.projectedAnnualRevenueCents) },
    { label: "Unsold platform", value: String(analytics.unsoldPlatformSlots) },
    { label: "Unsold venue (est.)", value: String(analytics.unsoldVenueSlotEstimate) },
    { label: "Waiting list", value: String(analytics.waitingListCount) },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="glass-panel rounded-xl border border-white/10 p-4">
          <p className="text-xs text-muted-foreground">{s.label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function ContractList({
  contracts,
  busy,
  setBusy,
  onRefresh,
}: {
  contracts: SponsorshipBusinessContract[];
  busy: boolean;
  setBusy: (v: boolean) => void;
  onRefresh: () => void;
}) {
  async function act(id: string, action: "expire" | "cancel" | "activate") {
    setBusy(true);
    const fn =
      action === "expire"
        ? expirePremiumSponsorshipAction
        : action === "cancel"
          ? cancelPremiumSponsorshipAction
          : activatePremiumSponsorshipAction;
    const result = await fn(id);
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Updated");
      onRefresh();
    }
  }

  return (
    <section className="glass-panel rounded-xl border border-white/10 p-6">
      <h3 className="font-semibold">All contracts ({contracts.length})</h3>
      <ul className="mt-4 space-y-3">
        {contracts.map((c) => (
          <li key={c.id} className="rounded-xl border border-white/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{c.displayLabel}</p>
                <p className="text-sm text-muted-foreground">
                  {c.slotName} · {c.organizationName ?? "No org"} · {formatCents(c.contractValueCents)}
                  {c.venueName ? ` · ${c.venueName}` : ""}
                  {c.stateCode ? ` · ${c.stateCode}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.contractStartsAt ?? "—"} → {c.contractEndsAt ?? "—"} · {c.paymentFrequency ?? "annual"}
                  {c.autoRenew ? " · auto-renew" : " · manual renewal"}
                </p>
                {c.contactEmail ? <p className="text-xs text-muted-foreground">{c.contactName} · {c.contactEmail}</p> : null}
              </div>
              <Badge variant="outline">{c.status}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.status === "pending" || c.status === "reserved" ? (
                <Button size="sm" disabled={busy} onClick={() => void act(c.id, "activate")}>Activate</Button>
              ) : null}
              {c.status === "active" ? (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(c.id, "expire")}>Expire</Button>
              ) : null}
              {["active", "pending", "reserved"].includes(c.status) ? (
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act(c.id, "cancel")}>Cancel</Button>
              ) : null}
            </div>
          </li>
        ))}
        {!contracts.length ? <p className="text-sm text-muted-foreground">No contracts yet.</p> : null}
      </ul>
    </section>
  );
}

function InventoryOverview({
  contracts,
  waitingList,
}: {
  contracts: SponsorshipBusinessContract[];
  waitingList: WaitingListEntry[];
}) {
  const active = contracts.filter((c) => c.status === "active").length;
  const reserved = contracts.filter((c) => c.status === "reserved").length;
  const pending = contracts.filter((c) => c.status === "pending").length;
  const expired = contracts.filter((c) => c.status === "expired").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Available", count: "—", color: "text-emerald-300" },
          { label: "Reserved", count: reserved, color: "text-amber-300" },
          { label: "Sold (active)", count: active, color: "text-primary" },
          { label: "Pending", count: pending, color: "text-blue-300" },
          { label: "Waiting list", count: waitingList.length, color: "text-violet-300" },
        ].map((s) => (
          <div key={s.label} className="glass-panel rounded-xl border border-white/10 p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>
      <div className="glass-panel rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
        <h3 className="font-semibold text-amber-100">What we do not sell</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {NON_INVENTORY_EXAMPLES.map((item) => (
            <Badge key={item} variant="outline" className="text-xs">{item}</Badge>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted-foreground">Expired contracts: {expired}</p>
    </div>
  );
}

function WaitingListPanel({
  entries,
  busy,
  setBusy,
  onRefresh,
}: {
  entries: WaitingListEntry[];
  busy: boolean;
  setBusy: (v: boolean) => void;
  onRefresh: () => void;
}) {
  async function convert(entryId: string) {
    setBusy(true);
    const result = await convertWaitingListAction({
      entryId,
      contractValueCents: 2500000,
      contractLengthMonths: 12,
      contractStartsAt: new Date().toISOString().slice(0, 10),
    });
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Converted to contract");
      onRefresh();
    }
  }

  return (
    <section className="glass-panel rounded-xl border border-white/10 p-6">
      <h3 className="font-semibold">Waiting list ({entries.length})</h3>
      <ul className="mt-4 space-y-3">
        {entries.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3 text-sm">
            <div>
              <p className="font-medium">{e.organizationName}</p>
              <p className="text-muted-foreground">{e.slotName}{e.venueName ? ` · ${e.venueName}` : ""} · #{e.queuePosition}</p>
              <p className="text-xs text-muted-foreground">{e.contactEmail}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => void convert(e.id)}>Convert to contract</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={async () => {
                setBusy(true);
                const r = await removeFromWaitingListAction(e.id);
                setBusy(false);
                if (!r.ok) toast.error(r.error);
                else onRefresh();
              }}>Remove</Button>
            </div>
          </li>
        ))}
        {!entries.length ? <p className="text-sm text-muted-foreground">No companies on waiting lists.</p> : null}
      </ul>
    </section>
  );
}

function AuctionPanel({
  auctions,
  auctionBids,
  venueOptions,
  busy,
  setBusy,
  onRefresh,
}: {
  auctions: SponsorshipAuction[];
  auctionBids: Record<string, SponsorshipBid[]>;
  venueOptions: VenueOpt[];
  busy: boolean;
  setBusy: (v: boolean) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      <form
        className="glass-panel grid gap-3 rounded-xl border border-white/10 p-6 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const fd = new FormData(e.currentTarget);
          const result = await createSponsorshipAuctionAction({
            slotTypeSlug: String(fd.get("slotTypeSlug")),
            venueId: String(fd.get("venueId") || "") || null,
            displayLabel: String(fd.get("displayLabel")),
            startingBidCents: Number(fd.get("startingBidCents") || 0),
            reservePriceCents: Number(fd.get("reservePriceCents") || 0) || null,
            closesAt: String(fd.get("closesAt") || "") || null,
          });
          setBusy(false);
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Auction created");
            onRefresh();
          }
        }}
      >
        <h3 className="font-semibold sm:col-span-2">Open premium auction</h3>
        <Field label="Slot"><Input name="slotTypeSlug" defaultValue="arena_naming_rights" required /></Field>
        <Field label="Venue">
          <select name="venueId" className={selectClass}>
            <option value="">—</option>
            {venueOptions.map((v) => <option key={v.id} value={v.id}>{v.default_name}</option>)}
          </select>
        </Field>
        <Field label="Label"><Input name="displayLabel" placeholder="Boston Stadium Naming Rights" required /></Field>
        <Field label="Starting bid (cents)"><Input name="startingBidCents" type="number" defaultValue={1000000} /></Field>
        <Field label="Reserve (cents)"><Input name="reservePriceCents" type="number" /></Field>
        <Field label="Closes at"><Input name="closesAt" type="datetime-local" /></Field>
        <Button type="submit" disabled={busy} className="sm:col-span-2 w-fit">Create auction</Button>
      </form>

      <ul className="space-y-4">
        {auctions.map((a) => (
          <li key={a.id} className="glass-panel rounded-xl border border-white/10 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-medium">{a.displayLabel}</p>
                <p className="text-sm text-muted-foreground">{a.slotName}{a.venueName ? ` · ${a.venueName}` : ""}</p>
                <p className="text-sm">High bid: {formatCents(a.currentHighBidCents)} · {a.bidCount} bids</p>
              </div>
              <Badge>{a.status}</Badge>
            </div>
            {(auctionBids[a.id] ?? []).map((b) => (
              <div key={b.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-white/5 p-2 text-sm">
                <span>{b.organizationName} · {formatCents(b.bidAmountCents)} · {b.status}</span>
                {b.status === "pending" ? (
                  <div className="flex gap-1">
                    <Button size="sm" disabled={busy} onClick={async () => {
                      setBusy(true);
                      const r = await respondToBidAction({ bidId: b.id, action: "accept" });
                      setBusy(false);
                      if (!r.ok) toast.error(r.error);
                      else onRefresh();
                    }}>Accept</Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={async () => {
                      setBusy(true);
                      const r = await respondToBidAction({ bidId: b.id, action: "reject" });
                      setBusy(false);
                      if (!r.ok) toast.error(r.error);
                      else onRefresh();
                    }}>Reject</Button>
                  </div>
                ) : null}
              </div>
            ))}
            {a.status === "open" ? (
              <Button size="sm" variant="secondary" className="mt-2" disabled={busy} onClick={async () => {
                setBusy(true);
                const r = await closeSponsorshipAuctionAction(a.id);
                setBusy(false);
                if (!r.ok) toast.error(r.error);
                else onRefresh();
              }}>Close auction</Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PriceHistoryPanel({ entries }: { entries: PriceHistoryEntry[] }) {
  return (
    <section className="glass-panel rounded-xl border border-white/10 p-6">
      <h3 className="font-semibold">Price history</h3>
      <ul className="mt-4 space-y-2 text-sm">
        {entries.map((e) => (
          <li key={e.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-white/10 p-3">
            <span>{e.sponsorName} · {e.slotName}{e.venueName ? ` · ${e.venueName}` : ""}</span>
            <span className="font-medium tabular-nums">{formatCents(e.contractValueCents)}</span>
            <span className="w-full text-xs text-muted-foreground">
              {e.contractLengthMonths ? `${e.contractLengthMonths}mo` : "—"} · expires {e.expirationDate ?? "—"} · lifetime {formatCents(e.lifetimeRevenueCents)}{e.renewed ? " · renewed" : ""}
            </span>
          </li>
        ))}
        {!entries.length ? <p className="text-muted-foreground">No historical sales recorded yet.</p> : null}
      </ul>
    </section>
  );
}

function SlotTypePanel({
  busy,
  setBusy,
  onRefresh,
}: {
  busy: boolean;
  setBusy: (v: boolean) => void;
  onRefresh: () => void;
}) {
  return (
    <form
      className="glass-panel grid gap-3 rounded-xl border border-white/10 p-6 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const fd = new FormData(e.currentTarget);
        const result = await createSponsorshipSlotTypeAction({
          slug: String(fd.get("slug")),
          name: String(fd.get("name")),
          description: String(fd.get("description") || "") || null,
          scope: String(fd.get("scope")),
          listPriceCents: Number(fd.get("listPriceCents") || 0) || null,
          tier: Number(fd.get("tier") || 50),
          auctionEnabled: fd.get("auctionEnabled") === "on",
        });
        setBusy(false);
        if (!result.ok) toast.error(result.error);
        else {
          toast.success("Slot type created — no code changes required");
          onRefresh();
        }
      }}
    >
      <h3 className="font-semibold sm:col-span-2">Create new sponsorship type (modular)</h3>
      <Field label="Slug (unique)"><Input name="slug" placeholder="official_tech_partner" required pattern="[a-z0-9_]+" /></Field>
      <Field label="Display name"><Input name="name" placeholder="Official Tech Partner" required /></Field>
      <Field label="Scope">
        <select name="scope" className={selectClass}>
          <option value="venue">Venue</option>
          <option value="event">Event</option>
          <option value="tour">Tour</option>
          <option value="platform">Platform</option>
          <option value="featured_stage">Featured Stage</option>
        </select>
      </Field>
      <Field label="List price (cents)"><Input name="listPriceCents" type="number" /></Field>
      <Field label="Tier (0–100)"><Input name="tier" type="number" defaultValue={50} /></Field>
      <Field label="Description"><Input name="description" /></Field>
      <Field label="Auction enabled"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="auctionEnabled" /> Allow auction mode</label></Field>
      <Button type="submit" disabled={busy} className="sm:col-span-2 w-fit">Create slot type</Button>
    </form>
  );
}
