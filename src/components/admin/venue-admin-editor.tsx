"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  addVenueFeaturedArtistAction,
  assignVenueThemeAction,
  moderateVenuePostAction,
  removeVenueFeaturedArtistAction,
  upsertConcourseShopAction,
  upsertSponsorOrganizationAction,
  upsertVenueAction,
  upsertVenueSponsorshipAction,
  assignEventVenueAction,
} from "@/lib/actions/venues-admin";
import { adminAdjustVenueLoyaltyAction } from "@/lib/actions/venue-loyalty";
import { VenueNamingManagement } from "@/components/admin/venue-naming-management";
import { VenueSponsorshipInventory } from "@/components/admin/venue-sponsorship-inventory";
import type { VenueAdminDetail } from "@/lib/data/venues";
import type { VenueInventoryRow } from "@/lib/sponsorship/inventory";
import { formatCents } from "@/lib/format";

const SPONSOR_PRODUCTS = [
  { value: "venue_naming_rights", label: "Venue naming rights" },
  { value: "founding_sponsor", label: "Founding sponsor" },
  { value: "digital_billboard", label: "Digital billboard" },
  { value: "homepage_banner", label: "Homepage banner" },
  { value: "concourse_booth", label: "Concourse booth" },
  { value: "pre_show_ad", label: "Pre-show advertising" },
  { value: "vip_lounge", label: "VIP lounge" },
  { value: "merch_sponsorship", label: "Merch sponsorship" },
] as const;

const SHOP_KINDS = [
  "merchandise",
  "food_sponsor",
  "advertisement_kiosk",
  "photo_booth",
  "meet_and_greet",
  "event_board",
  "charity",
  "information_desk",
] as const;

export function AdminVenueEditor({
  data,
  sponsorshipInventory = [],
  sponsorshipRevenueCents = 0,
}: {
  data: VenueAdminDetail;
  sponsorshipInventory?: VenueInventoryRow[];
  sponsorshipRevenueCents?: number;
}) {
  const router = useRouter();
  const { venue } = data;
  const [saving, setSaving] = useState(false);

  async function saveGeneral(formData: FormData) {
    setSaving(true);
    const result = await upsertVenueAction({
      id: venue.id,
      slug: formData.get("slug"),
      defaultName: formData.get("defaultName"),
      region: formData.get("region"),
      stateCode: formData.get("stateCode") || null,
      venueTypeSlug: formData.get("venueTypeSlug"),
      capacity: formData.get("capacity"),
      softCapacityLimit: formData.get("softCapacityLimit") || null,
      description: formData.get("description") || null,
      bannerUrl: formData.get("bannerUrl") || null,
      heroImageUrl: formData.get("heroImageUrl") || null,
      isActive: formData.get("isActive") === "on",
    });
    setSaving(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Venue saved");
      router.refresh();
    }
  }

  return (
    <Tabs defaultValue="general" className="mt-6">
      <TabsList className="flex h-auto flex-wrap gap-1">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="naming">Venue Management</TabsTrigger>
        <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
        <TabsTrigger value="artists">Featured artists</TabsTrigger>
        <TabsTrigger value="theme">Seasonal theme</TabsTrigger>
        <TabsTrigger value="concourse">Concourse</TabsTrigger>
        <TabsTrigger value="events">Events / rooms</TabsTrigger>
        <TabsTrigger value="moderation">Community</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-6">
        <form action={(fd) => void saveGeneral(fd)} className="glass-panel space-y-4 rounded-xl border border-white/10 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultName">Placeholder name</Label>
              <Input id="defaultName" name="defaultName" defaultValue={venue.default_name ?? venue.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (permanent)</Label>
              <Input id="slug" name="slug" defaultValue={venue.slug} required readOnly className="opacity-70" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input id="region" name="region" defaultValue={venue.region} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stateCode">State code</Label>
              <Input id="stateCode" name="stateCode" defaultValue={venue.state_code ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venueTypeSlug">Venue type</Label>
              <select
                id="venueTypeSlug"
                name="venueTypeSlug"
                defaultValue={venue.venue_types?.slug ?? "arena"}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {data.venueTypes.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" name="capacity" type="number" defaultValue={venue.capacity} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="softCapacityLimit">Soft concurrent event limit</Label>
              <Input
                id="softCapacityLimit"
                name="softCapacityLimit"
                type="number"
                defaultValue={venue.soft_capacity_limit ?? ""}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={4} defaultValue={venue.description ?? ""} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bannerUrl">Banner URL</Label>
              <Input id="bannerUrl" name="bannerUrl" defaultValue={venue.banner_url ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroImageUrl">Hero image URL</Label>
              <Input id="heroImageUrl" name="heroImageUrl" defaultValue={venue.hero_image_url ?? ""} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={venue.is_active} className="size-4 rounded border" />
            Venue active (public)
          </label>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save venue"}
          </Button>
        </form>
        <div className="mt-6 rounded-xl border border-white/10 p-4 text-sm">
          <p className="font-medium">Billboards</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {data.billboards.map((b) => (
              <li key={b.id}>
                {b.label} ({b.slug}){b.is_active ? "" : " — inactive"}
              </li>
            ))}
          </ul>
        </div>
      </TabsContent>

      <TabsContent value="naming" className="mt-6 space-y-8">
        <VenueNamingManagement venue={venue} />
        <div className="glass-panel rounded-xl border border-white/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold">Premium sponsorship inventory</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Exclusive slots — one sponsor each. Revenue from active contracts:{" "}
                <strong>{formatCents(sponsorshipRevenueCents)}</strong>
              </p>
            </div>
          </div>
          <div className="mt-6">
            <VenueSponsorshipInventory
              venue={venue}
              inventory={sponsorshipInventory}
              organizations={data.sponsorOrganizations}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="sponsors" className="mt-6 space-y-8">
        <SponsorOrgForm organizations={data.sponsorOrganizations} />
        <SponsorshipForm
          venueId={venue.id}
          organizations={data.sponsorOrganizations}
          sponsorships={data.sponsorships}
        />
      </TabsContent>

      <TabsContent value="artists" className="mt-6">
        <FeaturedArtistsPanel data={data} />
      </TabsContent>

      <TabsContent value="theme" className="mt-6">
        <ThemePanel data={data} />
      </TabsContent>

      <TabsContent value="concourse" className="mt-6">
        <ConcoursePanel data={data} />
      </TabsContent>

      <TabsContent value="events" className="mt-6">
        <VenueEventsAdminPanel venueId={venue.id} events={data.venueEvents} />
      </TabsContent>

      <TabsContent value="moderation" className="mt-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Public feed:{" "}
          <a
            href={`/livecircuit/venues/${venue.slug}/community`}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            /livecircuit/venues/{venue.slug}/community
          </a>
        </p>
        <ModerationPanel venueId={venue.id} posts={data.moderationPosts} />
        <LoyaltyAdjustPanel venueId={venue.id} />
      </TabsContent>
    </Tabs>
  );
}

function SponsorOrgForm({
  organizations,
}: {
  organizations: VenueAdminDetail["sponsorOrganizations"];
}) {
  const router = useRouter();

  async function submit(formData: FormData) {
    const result = await upsertSponsorOrganizationAction({
      slug: formData.get("slug"),
      name: formData.get("name"),
      logoUrl: formData.get("logoUrl") || null,
      websiteUrl: formData.get("websiteUrl") || null,
      billingEmail: formData.get("billingEmail") || null,
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Sponsor organization saved");
      router.refresh();
    }
  }

  return (
    <div className="glass-panel rounded-xl border border-white/10 p-6">
      <h3 className="font-semibold">Sponsor organization</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Register a company before assigning naming rights or Founding Sponsor status.
      </p>
      {organizations.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {organizations.length} organization(s) on file — create another below if needed.
        </p>
      ) : null}
      <form action={(fd) => void submit(fd)} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input name="name" placeholder="Company name" required />
        <Input name="slug" placeholder="company-slug" required />
        <Input name="logoUrl" placeholder="Logo URL" />
        <Input name="websiteUrl" placeholder="Website URL" />
        <Input name="billingEmail" placeholder="Billing email" className="sm:col-span-2" />
        <Button type="submit" className="sm:col-span-2 w-fit">
          Add sponsor org
        </Button>
      </form>
    </div>
  );
}

function SponsorshipForm({
  venueId,
  organizations,
  sponsorships,
}: {
  venueId: string;
  organizations: VenueAdminDetail["sponsorOrganizations"];
  sponsorships: VenueAdminDetail["sponsorships"];
}) {
  const router = useRouter();

  async function submit(formData: FormData) {
    const isFounding = formData.get("isFounding") === "on";
    const result = await upsertVenueSponsorshipAction({
      venueId,
      organizationId: formData.get("organizationId"),
      product: formData.get("product"),
      displayName: formData.get("displayName") || null,
      isFoundingSponsor: isFounding,
      priorityRenewal: formData.get("priorityRenewal") === "on" || isFounding,
      launchPricingCents: formData.get("launchPricingCents") || null,
      historyNote: formData.get("historyNote") || null,
      isActive: true,
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(isFounding ? "Founding Sponsor assigned" : "Sponsorship created");
      router.refresh();
    }
  }

  return (
    <div className="glass-panel rounded-xl border border-white/10 p-6">
      <h3 className="font-semibold">Venue sponsorship</h3>
      <ul className="mt-4 space-y-3 text-sm">
        {sponsorships.map((s) => (
          <li key={s.id} className="rounded-lg border border-white/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{s.sponsor_organizations?.name ?? "Sponsor"}</span>
              <Badge variant="secondary">{s.product.replace(/_/g, " ")}</Badge>
              {s.is_founding_sponsor ? <Badge>Founding Sponsor</Badge> : null}
              {!s.is_active ? <Badge variant="outline">Inactive</Badge> : null}
            </div>
            {s.display_name ? <p className="mt-1 text-muted-foreground">{s.display_name}</p> : null}
            {s.priority_renewal ? (
              <p className="mt-1 text-xs text-muted-foreground">Priority renewal enabled</p>
            ) : null}
          </li>
        ))}
        {!sponsorships.length ? (
          <p className="text-muted-foreground">No sponsorships yet — assign a Founding Sponsor to create scarcity.</p>
        ) : null}
      </ul>
      {organizations.length ? (
        <form action={(fd) => void submit(fd)} className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Sponsor</Label>
            <select
              name="organizationId"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Product</Label>
            <select
              name="product"
              defaultValue="founding_sponsor"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {SPONSOR_PRODUCTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <Input name="displayName" placeholder='Display name e.g. "The Coca-Cola Arena"' className="sm:col-span-2" />
          <Input name="launchPricingCents" type="number" placeholder="Launch pricing (cents)" />
          <Textarea name="historyNote" placeholder="Venue history note" className="sm:col-span-2" rows={2} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFounding" defaultChecked className="size-4 rounded border" />
            Founding Sponsor (one per venue)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="priorityRenewal" defaultChecked className="size-4 rounded border" />
            Priority renewal
          </label>
          <Button type="submit" className="sm:col-span-2 w-fit">
            Assign sponsorship
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Add a sponsor organization first.</p>
      )}
    </div>
  );
}

function FeaturedArtistsPanel({ data }: { data: VenueAdminDetail }) {
  const router = useRouter();

  async function add(formData: FormData) {
    const result = await addVenueFeaturedArtistAction({
      venueId: data.venue.id,
      artistSlug: formData.get("artistSlug"),
      sortOrder: formData.get("sortOrder") || 0,
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Featured artist added");
      router.refresh();
    }
  }

  async function remove(artistId: string) {
    const result = await removeVenueFeaturedArtistAction({
      venueId: data.venue.id,
      artistId,
    });
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  return (
    <div className="glass-panel rounded-xl border border-white/10 p-6">
      <ul className="space-y-2 text-sm">
        {data.featuredArtists.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 p-3">
            <span>{row.artists?.stage_name ?? "Artist"}</span>
            {row.artists?.id ? (
              <Button type="button" size="sm" variant="outline" onClick={() => void remove(row.artists!.id)}>
                Remove
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <form action={(fd) => void add(fd)} className="mt-4 flex flex-wrap gap-2">
        <Input name="artistSlug" placeholder="Artist slug" required className="max-w-xs" />
        <Input name="sortOrder" type="number" placeholder="Order" className="w-24" defaultValue={0} />
        <Button type="submit">Add featured artist</Button>
      </form>
    </div>
  );
}

function ThemePanel({ data }: { data: VenueAdminDetail }) {
  const router = useRouter();

  async function assign(formData: FormData) {
    const result = await assignVenueThemeAction({
      venueId: data.venue.id,
      themeSlug: formData.get("themeSlug"),
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Theme applied");
      router.refresh();
    }
  }

  return (
    <div className="glass-panel rounded-xl border border-white/10 p-6">
      {data.activeTheme ? (
        <p className="text-sm">
          Active:{" "}
          <span className="font-medium">{data.activeTheme.venue_themes?.name ?? "Theme"}</span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No seasonal theme assigned.</p>
      )}
      <form action={(fd) => void assign(fd)} className="mt-4 flex flex-wrap items-end gap-2">
        <select
          name="themeSlug"
          className="flex h-9 min-w-[200px] rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue={data.activeTheme?.venue_themes?.slug ?? data.themes[0]?.slug}
        >
          {data.themes.map((t) => (
            <option key={t.id} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
        <Button type="submit">Apply theme</Button>
      </form>
    </div>
  );
}

function ConcoursePanel({ data }: { data: VenueAdminDetail }) {
  const router = useRouter();

  async function addShop(formData: FormData) {
    const result = await upsertConcourseShopAction({
      venueId: data.venue.id,
      kind: formData.get("kind"),
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description") || null,
      isActive: true,
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Concourse shop added");
      router.refresh();
    }
  }

  return (
    <div className="glass-panel rounded-xl border border-white/10 p-6">
      <ul className="space-y-2 text-sm">
        {data.concourseShops.map((shop) => (
          <li key={shop.id} className="rounded-lg border border-white/10 p-3">
            <span className="font-medium">{shop.name}</span>
            <span className="ml-2 text-muted-foreground">{shop.kind.replace(/_/g, " ")}</span>
          </li>
        ))}
      </ul>
      <form action={(fd) => void addShop(fd)} className="mt-4 grid gap-2 sm:grid-cols-2">
        <Input name="name" placeholder="Shop name" required />
        <Input name="slug" placeholder="shop-slug" required />
        <select name="kind" className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm sm:col-span-2">
          {SHOP_KINDS.map((k) => (
            <option key={k} value={k}>
              {k.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <Input name="description" placeholder="Description" className="sm:col-span-2" />
        <Button type="submit" className="w-fit">
          Add concourse shop
        </Button>
      </form>
    </div>
  );
}

function VenueEventsAdminPanel({
  venueId,
  events,
}: {
  venueId: string;
  events: VenueAdminDetail["venueEvents"];
}) {
  const router = useRouter();

  async function assign(formData: FormData) {
    const result = await assignEventVenueAction({
      eventId: formData.get("eventId"),
      venueId,
      venueRoomLabel: formData.get("venueRoomLabel") || null,
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Event linked to venue");
      router.refresh();
    }
  }

  return (
    <div className="glass-panel rounded-xl border border-white/10 p-6">
      <p className="text-sm text-muted-foreground">
        {events.length} event(s) in this venue. Assign any event by UUID (syncs tour stop when present).
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {events.map((ev) => (
          <li key={ev.id} className="rounded-lg border border-white/10 p-3">
            <p className="font-medium">{ev.title}</p>
            <p className="text-xs text-muted-foreground">
              {ev.status} · {ev.artists?.stage_name ?? "Artist"}
              {ev.venue_room_label ? ` · ${ev.venue_room_label}` : ""}
            </p>
          </li>
        ))}
      </ul>
      <form action={(fd) => void assign(fd)} className="mt-6 grid gap-2 sm:grid-cols-2">
        <Input name="eventId" placeholder="Event UUID" required className="sm:col-span-2" />
        <Input name="venueRoomLabel" placeholder="Room label (optional)" className="sm:col-span-2" />
        <Button type="submit" className="w-fit">
          Assign event to this venue
        </Button>
      </form>
    </div>
  );
}

function LoyaltyAdjustPanel({ venueId }: { venueId: string }) {
  const router = useRouter();

  async function adjust(formData: FormData) {
    const result = await adminAdjustVenueLoyaltyAction({
      venueId,
      userId: formData.get("userId"),
      deltaPoints: formData.get("deltaPoints"),
      note: formData.get("note") || undefined,
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Loyalty updated");
      router.refresh();
    }
  }

  return (
    <form action={(fd) => void adjust(fd)} className="glass-panel mt-6 grid gap-3 rounded-xl p-6 sm:max-w-md">
      <p className="font-medium">Loyalty adjustment</p>
      <Label>Fan user ID (UUID)</Label>
      <Input name="userId" required />
      <Label>Point delta (+ / −)</Label>
      <Input name="deltaPoints" type="number" required defaultValue={100} />
      <Label>Note (optional)</Label>
      <Input name="note" maxLength={500} />
      <Button type="submit" className="w-fit">
        Apply adjustment
      </Button>
    </form>
  );
}

function ModerationPanel({
  venueId,
  posts,
}: {
  venueId: string;
  posts: VenueAdminDetail["moderationPosts"];
}) {
  const router = useRouter();

  async function mod(postId: string, action: "pin" | "unpin" | "delete") {
    const result = await moderateVenuePostAction({ postId, action });
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  void venueId;

  return (
    <div className="glass-panel rounded-xl border border-white/10 p-6">
      {!posts.length ? (
        <p className="text-sm text-muted-foreground">No community posts yet.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {posts.map((post) => (
            <li key={post.id} className="rounded-lg border border-white/10 p-3">
              {post.is_pinned ? <Badge className="mb-2">Pinned</Badge> : null}
              {post.title ? <p className="font-medium">{post.title}</p> : null}
              <p className="text-muted-foreground line-clamp-3">{post.body}</p>
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => void mod(post.id, "pin")}>
                  Pin
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void mod(post.id, "unpin")}>
                  Unpin
                </Button>
                <Button type="button" size="sm" variant="destructive" onClick={() => void mod(post.id, "delete")}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminVenueCreateForm({
  venueTypes,
}: {
  venueTypes: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function create(formData: FormData) {
    setSaving(true);
    const result = await upsertVenueAction({
      slug: formData.get("slug"),
      defaultName: formData.get("defaultName"),
      region: formData.get("region"),
      stateCode: formData.get("stateCode") || null,
      venueTypeSlug: formData.get("venueTypeSlug"),
      capacity: formData.get("capacity") || 50000,
      description: formData.get("description") || null,
      isActive: formData.get("isActive") === "on",
    });
    setSaving(false);
    if (!result.ok) toast.error(result.error);
    else if (result.venueId) {
      toast.success("Venue created");
      router.push(`/admin/venues/${result.venueId}`);
    }
  }

  return (
    <form action={(fd) => void create(fd)} className="glass-panel mt-6 max-w-2xl space-y-4 rounded-xl border border-white/10 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="defaultName">Placeholder name</Label>
          <Input id="defaultName" name="defaultName" required placeholder="Boston Community Arena" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" required placeholder="new-york-city-arena" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Input id="region" name="region" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stateCode">State code</Label>
          <Input id="stateCode" name="stateCode" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="venueTypeSlug">Type</Label>
          <select
            id="venueTypeSlug"
            name="venueTypeSlug"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {venueTypes.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" name="capacity" type="number" defaultValue={50000} />
        </div>
      </div>
      <Textarea name="description" placeholder="Venue description" rows={3} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked className="size-4 rounded border" />
        Active on create
      </label>
      <Button type="submit" disabled={saving}>
        {saving ? "Creating…" : "Create venue"}
      </Button>
    </form>
  );
}
