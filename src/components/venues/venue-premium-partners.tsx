import { Badge } from "@/components/ui/badge";
import type { VenueInventoryRow } from "@/lib/sponsorship/inventory";
import { getVenueDisplayName } from "@/lib/venues/display-name";
import type { VenueListItem } from "@/lib/data/venues";

/** Tasteful venue partner strip — sold slots only, never ad flooding. */
export function VenuePremiumPartners({
  venue,
  inventory,
}: {
  venue: VenueListItem;
  inventory: VenueInventoryRow[];
}) {
  const active = inventory.filter((row) => row.contract?.status === "active");

  if (!active.length) return null;

  return (
    <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Exclusive venue partners
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {getVenueDisplayName(venue)} · permanent venue ID{" "}
        <span className="font-mono text-xs">{venue.id.slice(0, 8)}</span>
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {active.map(({ slot, contract }) => (
          <li key={slot.slug}>
            <Badge variant="outline" className="border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-normal">
              <span className="text-muted-foreground">{slot.name} · </span>
              {contract!.displayLabel}
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
