"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LOCAL_BUSINESS_CAMPAIGNS,
  LOCAL_BUSINESS_CATEGORIES,
} from "@/lib/constants/local-business";
import { formatCents } from "@/lib/format";
import {
  createLocalCouponAction,
  linkVenueLocalBusinessAction,
  startLocalCampaignCheckoutAction,
  upsertLocalBusinessAction,
} from "@/lib/actions/local-business";
import type { LocalBusinessDashboardReport } from "@/lib/types/local-business";

export function LocalBusinessDashboard({ report }: { report: LocalBusinessDashboardReport }) {
  const router = useRouter();
  const b = report.business;
  const [name, setName] = useState(b?.name ?? "");
  const [category, setCategory] = useState(b?.category ?? LOCAL_BUSINESS_CATEGORIES[0].value);
  const [description, setDescription] = useState(b?.description ?? "");
  const [city, setCity] = useState(b?.city ?? "");
  const [website, setWebsite] = useState(b?.websiteUrl ?? "");
  const [venueSlug, setVenueSlug] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponTitle, setCouponTitle] = useState("");
  const [discountLabel, setDiscountLabel] = useState("10% off");
  const [campaignVenue, setCampaignVenue] = useState("");
  const [campaignFestival, setCampaignFestival] = useState("");

  async function saveBusiness(e: React.FormEvent) {
    e.preventDefault();
    const result = await upsertLocalBusinessAction({
      name: name.trim(),
      category,
      description: description.trim(),
      city: city.trim(),
      websiteUrl: website.trim() || undefined,
      isPublished: true,
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Business saved");
      router.refresh();
    }
  }

  async function linkVenue() {
    const result = await linkVenueLocalBusinessAction({ venueSlug: venueSlug.trim(), isFeatured: false });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Linked to venue");
      router.refresh();
    }
  }

  async function addCoupon(e: React.FormEvent) {
    e.preventDefault();
    const result = await createLocalCouponAction({
      code: couponCode.trim(),
      title: couponTitle.trim(),
      discountLabel: discountLabel.trim(),
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Coupon created");
      setCouponCode("");
      setCouponTitle("");
      router.refresh();
    }
  }

  async function buyCampaign(type: string) {
    const result = await startLocalCampaignCheckoutAction({
      campaignType: type,
      venueSlug: campaignVenue.trim() || undefined,
      festivalSlug: campaignFestival.trim() || undefined,
    });
    if (!result.ok) toast.error(result.error);
    else if (result.url) window.location.href = result.url;
  }

  return (
    <div className="space-y-10">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4 text-sm">
          <div>
            <p className="text-2xl font-bold tabular-nums">{report.analytics.impressions}</p>
            <p className="text-muted-foreground">Impressions</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{report.analytics.clicks}</p>
            <p className="text-muted-foreground">Clicks</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{report.analytics.couponRedemptions}</p>
            <p className="text-muted-foreground">Redemptions</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{report.analytics.activeCampaigns}</p>
            <p className="text-muted-foreground">Active campaigns</p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={saveBusiness} className="glass-panel space-y-4 rounded-xl p-6">
        <h2 className="text-xl font-semibold">Business profile</h2>
        <div className="space-y-2">
          <Label htmlFor="name">Business name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat">Category</Label>
          <select
            id="cat"
            className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {LOCAL_BUSINESS_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website URL" />
        </div>
        <Button type="submit">Save & publish</Button>
      </form>

      {b ? (
        <>
          <div className="glass-panel space-y-3 rounded-xl p-6">
            <h2 className="text-xl font-semibold">Link to venue</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={venueSlug}
                onChange={(e) => setVenueSlug(e.target.value)}
                placeholder="Venue slug (e.g. new-york-city-arena)"
              />
              <Button type="button" variant="outline" onClick={linkVenue}>
                Link
              </Button>
            </div>
          </div>

          <form onSubmit={addCoupon} className="glass-panel space-y-3 rounded-xl p-6">
            <h2 className="text-xl font-semibold">Create coupon</h2>
            <Input value={couponTitle} onChange={(e) => setCouponTitle(e.target.value)} placeholder="Offer title" required />
            <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="CODE" required />
            <Input value={discountLabel} onChange={(e) => setDiscountLabel(e.target.value)} placeholder="Discount label" />
            <Button type="submit" variant="outline">
              Add coupon
            </Button>
          </form>

          <section className="glass-panel space-y-4 rounded-xl p-6">
            <h2 className="text-xl font-semibold">Purchase campaigns</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={campaignVenue}
                onChange={(e) => setCampaignVenue(e.target.value)}
                placeholder="Venue slug (for venue ads)"
              />
              <Input
                value={campaignFestival}
                onChange={(e) => setCampaignFestival(e.target.value)}
                placeholder="Festival slug (for festival sponsor)"
              />
            </div>
            <ul className="space-y-3">
              {LOCAL_BUSINESS_CAMPAIGNS.map((pkg) => (
                <li key={pkg.type} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{pkg.label}</p>
                    <p className="text-muted-foreground">{pkg.description}</p>
                  </div>
                  <Button size="sm" onClick={() => buyCampaign(pkg.type)}>
                    {formatCents(pkg.priceCents)}
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          {report.redemptions.length > 0 ? (
            <section>
              <h2 className="text-lg font-semibold">Recent redemptions</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {report.redemptions.map((r, i) => (
                  <li key={i} className="text-muted-foreground">
                    {r.couponTitle} — {r.userDisplay} · {new Date(r.redeemedAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
