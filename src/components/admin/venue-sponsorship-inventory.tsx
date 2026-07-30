"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { upsertPremiumSponsorshipAction } from "@/lib/actions/sponsorship-admin";
import type { VenueInventoryRow } from "@/lib/sponsorship/inventory";
import { formatCents } from "@/lib/format";
import { getVenueDisplayName } from "@/lib/venues/display-name";
import type { VenueListItem } from "@/lib/data/venues";

export function VenueSponsorshipInventory({
  venue,
  inventory,
  organizations,
}: {
  venue: VenueListItem;
  inventory: VenueInventoryRow[];
  organizations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function quickAssign(slotSlug: string, label: string, orgId: string, cents: number) {
    setBusy(slotSlug);
    const result = await upsertPremiumSponsorshipAction({
      slotTypeSlug: slotSlug,
      venueId: venue.id,
      organizationId: orgId || null,
      displayLabel: label,
      contractValueCents: cents,
      status: "active",
    });
    setBusy(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Slot assigned");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-xl border border-white/10 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Internal name (permanent)</p>
        <p className="font-medium">{venue.default_name}</p>
        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Public display name</p>
        <p className="font-medium text-primary">{getVenueDisplayName(venue)}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">ID: {venue.id.slice(0, 8)}… · /{venue.slug}</p>
      </div>

      <ul className="space-y-3">
        {inventory.map(({ slot, contract, available }) => (
          <li key={slot.slug} className="rounded-xl border border-white/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{slot.name}</p>
                <p className="text-sm text-muted-foreground">{slot.description}</p>
                {slot.listPriceCents ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    List: {formatCents(slot.listPriceCents)}
                  </p>
                ) : null}
              </div>
              {available ? (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
                  Available
                </Badge>
              ) : (
                <Badge className="bg-primary/20">Sold</Badge>
              )}
            </div>
            {contract ? (
              <div className="mt-3 text-sm">
                <p>
                  <strong>{contract.displayLabel}</strong>
                  {contract.organizationName ? ` · ${contract.organizationName}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {formatCents(contract.contractValueCents)}
                  {contract.contractEndsAt ? ` · through ${contract.contractEndsAt}` : ""}
                </p>
              </div>
            ) : organizations.length ? (
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                disabled={Boolean(busy)}
                onClick={() => {
                  const org = organizations[0]!;
                  const label =
                    slot.slug === "arena_naming_rights"
                      ? `${org.name} ${venue.default_name.replace(/ Arena$/, "")}`
                      : `${org.name} ${slot.name}`;
                  void quickAssign(slot.slug, label, org.id, slot.listPriceCents ?? 500000);
                }}
              >
                Quick assign (demo)
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
