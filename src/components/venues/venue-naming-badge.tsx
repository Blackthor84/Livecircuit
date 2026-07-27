import { Badge } from "@/components/ui/badge";
import {
  getVenueDisplayName,
  hasActiveVenueSponsorship,
  sponsorshipStatusLabel,
} from "@/lib/venues/display-name";
import type { VenueNamingFields } from "@/lib/venues/display-name";
import { cn } from "@/lib/utils";

export function VenueNamingBadge({
  venue,
  className,
  size = "default",
}: {
  venue: VenueNamingFields;
  className?: string;
  size?: "default" | "sm";
}) {
  const sponsored = hasActiveVenueSponsorship(venue);

  if (sponsored) {
    return (
      <Badge
        className={cn(
          "gap-1 bg-primary/90 text-primary-foreground",
          size === "sm" && "text-[10px] px-1.5 py-0",
          className
        )}
      >
        {venue.sponsor_company ?? "Official Sponsor"}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-amber-500/40 bg-amber-500/10 text-amber-400",
        size === "sm" && "text-[10px] px-1.5 py-0",
        className
      )}
    >
      Naming Rights Available
    </Badge>
  );
}

export function VenueSponsorshipStatusBadge({
  venue,
  className,
}: {
  venue: VenueNamingFields;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={className}>
      {sponsorshipStatusLabel(venue.sponsorship_status)}
    </Badge>
  );
}

export function venueCardTitle(venue: VenueNamingFields): string {
  return getVenueDisplayName(venue);
}
