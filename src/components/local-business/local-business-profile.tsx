"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { localBusinessCategoryLabel } from "@/lib/constants/local-business";
import { recordLocalBusinessClickAction, redeemLocalCouponAction } from "@/lib/actions/local-business";
import type { LocalBusinessDetail } from "@/lib/types/local-business";

export function LocalBusinessProfile({
  business,
  venueSlug,
}: {
  business: LocalBusinessDetail;
  venueSlug?: string;
}) {
  const router = useRouter();

  async function redeem(couponId: string) {
    const result = await redeemLocalCouponAction({ couponId, venueSlug });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Coupon saved to your account");
      router.refresh();
    }
  }

  async function onWebsiteClick() {
    await recordLocalBusinessClickAction({ businessId: business.id });
  }

  return (
    <div className="space-y-8">
      <div className="glass-panel rounded-xl p-6">
        <Badge>{localBusinessCategoryLabel(business.category)}</Badge>
        <h1 className="mt-2 text-3xl font-bold">{business.name}</h1>
        {business.city ? <p className="text-sm text-muted-foreground">{business.city}</p> : null}
        <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{business.description}</p>
        {business.websiteUrl ? (
          <Button className="mt-4" variant="outline" href={business.websiteUrl} onClick={onWebsiteClick}>
            Visit website
          </Button>
        ) : null}
        {business.activeCampaigns.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {business.activeCampaigns.map((c) => (
              <Badge key={c.type} variant="outline">
                {c.label}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      {business.venues.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Near venues</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {business.venues.map((v) => (
              <li key={v.slug}>
                <Link href={`/livecircuit/venues/${v.slug}/local`} className="text-primary hover:underline">
                  {v.name}
                </Link>
                {v.isFeatured ? <Badge className="ml-2">Featured</Badge> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Coupons</h2>
        {business.coupons.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No active offers.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {business.coupons.map((c) => (
              <li key={c.id} className="glass-panel rounded-xl p-4">
                <p className="font-medium">{c.title}</p>
                <p className="text-sm text-primary">{c.discountLabel}</p>
                {c.description ? <p className="mt-1 text-sm text-muted-foreground">{c.description}</p> : null}
                <p className="mt-2 font-mono text-xs">Code: {c.code}</p>
                {c.redeemedByUser ? (
                  <Badge className="mt-2">Redeemed</Badge>
                ) : (
                  <Button size="sm" className="mt-3" onClick={() => redeem(c.id)}>
                    Redeem
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
