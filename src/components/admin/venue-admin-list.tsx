"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toggleVenueActiveAction } from "@/lib/actions/venues-admin";
import type { VenueListItem } from "@/lib/data/venues";

export function AdminVenueListPanel({ items }: { items: VenueListItem[] }) {
  const router = useRouter();

  async function toggleActive(venueId: string, isActive: boolean) {
    const result = await toggleVenueActiveAction({ venueId, isActive: !isActive });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(!isActive ? "Venue activated" : "Venue deactivated");
      router.refresh();
    }
  }

  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No venues yet.{" "}
        <Link href="/admin/venues/new" className="text-primary underline-offset-4 hover:underline">
          Create the first venue
        </Link>
        .
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Venue</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Region</TableHead>
          <TableHead className="text-right">Visitors</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((venue) => (
          <TableRow key={venue.id}>
            <TableCell>
              <Link
                href={`/admin/venues/${venue.id}`}
                className="font-medium hover:text-primary"
              >
                {venue.name}
              </Link>
              <p className="text-xs text-muted-foreground">/{venue.slug}</p>
              {!venue.is_active ? (
                <Badge variant="outline" className="mt-1">
                  Inactive
                </Badge>
              ) : null}
            </TableCell>
            <TableCell className="capitalize">{venue.venue_types?.name ?? "—"}</TableCell>
            <TableCell>
              {venue.region}
              {venue.state_code ? `, ${venue.state_code}` : ""}
            </TableCell>
            <TableCell className="text-right tabular-nums">{venue.current_visitors}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="secondary" href={`/admin/venues/${venue.id}`}>
                  Manage
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void toggleActive(venue.id, venue.is_active)}
                >
                  {venue.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
