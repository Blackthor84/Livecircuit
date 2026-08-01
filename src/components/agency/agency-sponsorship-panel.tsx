"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAgencySponsorshipProposalAction,
  updateAgencyProposalStatusAction,
} from "@/lib/actions/agency-features";
import type { AgencySponsorshipProposal } from "@/lib/data/agency-features";
import type { AgencyManagedArtist } from "@/lib/agency/types";
import type { MarketplaceListing } from "@/lib/sponsorship/marketplace";
import { formatCents } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  draft: "border-white/20",
  submitted: "border-primary/40 text-primary",
  under_review: "border-amber-500/40 text-amber-300",
  accepted: "border-emerald-500/40 text-emerald-300",
  rejected: "border-destructive/40 text-destructive",
  withdrawn: "text-muted-foreground",
};

export function AgencySponsorshipPanel({
  orgId,
  proposals,
  listings,
  roster,
}: {
  orgId: string;
  proposals: AgencySponsorshipProposal[];
  listings: MarketplaceListing[];
  roster: AgencyManagedArtist[];
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [artistId, setArtistId] = useState("");
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [budgetDollars, setBudgetDollars] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  const filteredListings = listings.filter((l) => !stateFilter || l.stateCode === stateFilter);
  const states = [...new Set(listings.map((l) => l.stateCode).filter(Boolean))] as string[];

  function submitProposal(submit: boolean) {
    if (!title.trim()) {
      toast.error("Proposal title required");
      return;
    }
    startTransition(async () => {
      const result = await createAgencySponsorshipProposalAction({
        orgId,
        title: title.trim(),
        description: description.trim() || undefined,
        artistId: artistId || undefined,
        slotTypeSlug: selectedListing?.slotTypeSlug,
        venueId: selectedListing?.venueId ?? undefined,
        budgetCents: budgetDollars ? Math.round(parseFloat(budgetDollars) * 100) : undefined,
        submit,
      });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(submit ? "Proposal submitted" : "Draft saved");
        setTitle("");
        setDescription("");
        setSelectedListing(null);
        setBudgetDollars("");
        window.location.reload();
      }
    });
  }

  function updateStatus(proposalId: string, status: "submitted" | "withdrawn") {
    startTransition(async () => {
      const result = await updateAgencyProposalStatusAction({ orgId, proposalId, status });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(status === "submitted" ? "Proposal submitted" : "Proposal withdrawn");
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Browse sponsorship inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
            >
              <option value="">All states</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {filteredListings.slice(0, 20).map((listing) => (
                <li key={`${listing.slotTypeSlug}-${listing.venueId ?? "platform"}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedListing(listing)}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                      selectedListing?.slotTypeSlug === listing.slotTypeSlug &&
                      selectedListing?.venueId === listing.venueId
                        ? "border-primary/40 bg-primary/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <p className="font-medium">{listing.slotName}</p>
                    <p className="text-xs text-muted-foreground">
                      {listing.venueName ?? "Platform-wide"}
                      {listing.stateCode ? ` · ${listing.stateCode}` : ""}
                      {listing.listPriceCents ? ` · ${formatCents(listing.listPriceCents)}` : ""}
                    </p>
                    <Badge variant="outline" className="mt-2 capitalize">
                      {listing.inventoryStatus.replace("_", " ")}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Submit proposal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedListing ? (
              <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                Selected: <strong>{selectedListing.slotName}</strong>
                {selectedListing.venueName ? ` at ${selectedListing.venueName}` : ""}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label>Proposal title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer tour naming package" />
            </div>
            <div className="space-y-2">
              <Label>Roster artist</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={artistId}
                onChange={(e) => setArtistId(e.target.value)}
              >
                <option value="">Agency-wide</option>
                {roster
                  .filter((r) => r.status === "active")
                  .map((r) => (
                    <option key={r.artist_id} value={r.artist_id}>
                      {r.artists?.stage_name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Campaign goals, audience fit, and activation ideas…"
              />
            </div>
            <div className="space-y-2">
              <Label>Budget (USD)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={budgetDollars}
                onChange={(e) => setBudgetDollars(e.target.value)}
                placeholder="25000"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={pending} onClick={() => submitProposal(false)}>
                Save draft
              </Button>
              <Button type="button" disabled={pending} onClick={() => submitProposal(true)}>
                Submit proposal
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Your proposals ({proposals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {proposals.length ? (
            <ul className="space-y-3">
              {proposals.map((proposal) => (
                <li
                  key={proposal.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 p-4"
                >
                  <div>
                    <p className="font-medium">{proposal.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {proposal.artist_name ? `${proposal.artist_name} · ` : ""}
                      {proposal.venue_name ?? proposal.slot_type_slug ?? "Custom package"}
                      {proposal.budget_cents ? ` · ${formatCents(proposal.budget_cents)}` : ""}
                    </p>
                    {proposal.description ? (
                      <p className="mt-2 text-sm text-muted-foreground">{proposal.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={STATUS_COLORS[proposal.status] ?? ""}>
                      {proposal.status.replace("_", " ")}
                    </Badge>
                    {proposal.status === "draft" ? (
                      <Button type="button" size="sm" disabled={pending} onClick={() => updateStatus(proposal.id, "submitted")}>
                        Submit
                      </Button>
                    ) : null}
                    {proposal.status === "submitted" ? (
                      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => updateStatus(proposal.id, "withdrawn")}>
                        Withdraw
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Draft and submit sponsorship proposals for your roster from available inventory above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
