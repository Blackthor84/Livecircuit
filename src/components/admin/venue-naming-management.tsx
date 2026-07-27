"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearVenueSponsorshipAction,
  renameVenuePlaceholderAction,
  updateVenueNamingRightsAction,
} from "@/lib/actions/venues-admin";
import type { VenueListItem } from "@/lib/data/venues";
import { formatCents } from "@/lib/format";
import {
  getVenueDisplayName,
  hasActiveVenueSponsorship,
  sponsorshipStatusLabel,
} from "@/lib/venues/display-name";
import { VenueSponsorshipStatusBadge } from "@/components/venues/venue-naming-badge";

export function VenueNamingManagement({ venue }: { venue: VenueListItem }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const displayName = getVenueDisplayName(venue);
  const sponsored = hasActiveVenueSponsorship(venue);

  async function renamePlaceholder(formData: FormData) {
    setSaving(true);
    const result = await renameVenuePlaceholderAction({
      venueId: venue.id,
      defaultName: formData.get("defaultName"),
    });
    setSaving(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Placeholder name updated");
      router.refresh();
    }
  }

  async function saveSponsorship(formData: FormData) {
    setSaving(true);
    const result = await updateVenueNamingRightsAction({
      venueId: venue.id,
      sponsoredName: formData.get("sponsoredName") || null,
      sponsorCompany: formData.get("sponsorCompany") || null,
      sponsorLogoUrl: formData.get("sponsorLogoUrl") || null,
      sponsorStartDate: formData.get("sponsorStartDate") || null,
      sponsorEndDate: formData.get("sponsorEndDate") || null,
      sponsorshipStatus: formData.get("sponsorshipStatus") || undefined,
      namingRightsPrice: formData.get("namingRightsPrice") || null,
    });
    setSaving(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Sponsorship updated");
      router.refresh();
    }
  }

  async function clearSponsorship() {
    setSaving(true);
    const result = await clearVenueSponsorshipAction({ venueId: venue.id });
    setSaving(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Sponsorship cleared — placeholder name restored");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl border border-white/10 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Venue Management</p>
            <h3 className="mt-1 text-xl font-semibold">{displayName}</h3>
            <p className="mt-1 font-mono text-xs text-muted-foreground">/{venue.slug}</p>
          </div>
          <VenueSponsorshipStatusBadge venue={venue} />
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Current display name</dt>
            <dd className="font-medium">{displayName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Placeholder name</dt>
            <dd className="font-medium">{venue.default_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Naming rights price</dt>
            <dd className="font-medium">
              {venue.naming_rights_price != null
                ? formatCents(venue.naming_rights_price)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Revenue status</dt>
            <dd className="font-medium">
              {sponsored ? (
                <Badge className="mt-1">Active contract</Badge>
              ) : (
                <span className="text-amber-400">{sponsorshipStatusLabel(venue.sponsorship_status)}</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <form
        action={(fd) => void renamePlaceholder(fd)}
        className="glass-panel space-y-4 rounded-xl border border-white/10 p-6"
      >
        <div>
          <h4 className="font-semibold">Rename placeholder</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Updates what fans see when no sponsor is active. The slug <code className="text-xs">{venue.slug}</code> never changes.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultName">Placeholder name</Label>
          <Input id="defaultName" name="defaultName" defaultValue={venue.default_name} required />
        </div>
        <Button type="submit" disabled={saving}>
          Rename venue
        </Button>
      </form>

      <form
        action={(fd) => void saveSponsorship(fd)}
        className="glass-panel space-y-4 rounded-xl border border-white/10 p-6"
      >
        <div>
          <h4 className="font-semibold">Sponsorship & naming rights</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign a sponsored display name. Events, artist pages, and tickets keep using the permanent venue ID and slug.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sponsoredName">Sponsored display name</Label>
            <Input
              id="sponsoredName"
              name="sponsoredName"
              defaultValue={venue.sponsored_name ?? ""}
              placeholder="Acme Community Arena"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsorCompany">Sponsor company</Label>
            <Input
              id="sponsorCompany"
              name="sponsorCompany"
              defaultValue={venue.sponsor_company ?? ""}
              placeholder="Acme Corp"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsorLogoUrl">Sponsor logo URL</Label>
            <Input
              id="sponsorLogoUrl"
              name="sponsorLogoUrl"
              type="url"
              defaultValue={venue.sponsor_logo_url ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="namingRightsPrice">Naming rights price (cents)</Label>
            <Input
              id="namingRightsPrice"
              name="namingRightsPrice"
              type="number"
              defaultValue={venue.naming_rights_price ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsorStartDate">Contract start</Label>
            <Input
              id="sponsorStartDate"
              name="sponsorStartDate"
              type="date"
              defaultValue={venue.sponsor_start_date?.slice(0, 10) ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsorEndDate">Contract end</Label>
            <Input
              id="sponsorEndDate"
              name="sponsorEndDate"
              type="date"
              defaultValue={venue.sponsor_end_date?.slice(0, 10) ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sponsorshipStatus">Status</Label>
            <select
              id="sponsorshipStatus"
              name="sponsorshipStatus"
              defaultValue={venue.sponsorship_status}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="available">Available</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            Save sponsorship
          </Button>
          {sponsored ? (
            <Button type="button" variant="outline" disabled={saving} onClick={() => void clearSponsorship()}>
              Clear sponsorship
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
