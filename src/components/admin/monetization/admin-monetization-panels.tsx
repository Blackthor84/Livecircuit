"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCouponAction,
  schedulePricingAction,
  updateAgencyPlanPricingAction,
  updateMarketingCreditsAction,
  updatePayoutConfigAction,
  updatePromotionProductAction,
  updateTaxConfigAction,
  updateTicketPricingAction,
} from "@/lib/actions/monetization-admin";
import type {
  MonetizationAgencyPlan,
  MonetizationAnalytics,
  MonetizationCoupon,
  MonetizationMarketingCredits,
  MonetizationPayoutConfig,
  MonetizationPricingHistoryRow,
  MonetizationPromotionProduct,
  MonetizationScheduledPricing,
  MonetizationSnapshot,
  MonetizationTaxConfig,
  MonetizationTicketConfig,
} from "@/lib/monetization/types";
import { formatCents } from "@/lib/format";
import { rollbackPricingHistoryAction } from "@/lib/actions/monetization-admin";

export function AdminTicketingPanel({ config }: { config: MonetizationTicketConfig }) {
  const [pending, startTransition] = useTransition();
  const fields = [
    ["platformFeePercent", "Platform ticket %", config.platformFeePercent],
    ["flatTicketFeeDollars", "Flat ticket fee ($)", config.flatTicketFeeCents / 100],
    ["minPlatformFeeDollars", "Min platform fee ($)", config.minPlatformFeeCents / 100],
    ["maxPlatformFeeDollars", "Max platform fee ($)", config.maxPlatformFeeCents != null ? config.maxPlatformFeeCents / 100 : ""],
    ["vipFeePercent", "VIP fee %", config.vipFeePercent],
    ["replayFeePercent", "Replay fee %", config.replayFeePercent],
    ["festivalPassFeePercent", "Festival pass fee %", config.festivalPassFeePercent],
    ["serviceFeePercent", "Service fee %", config.serviceFeePercent],
    ["refundFeeDollars", "Refund fee ($)", config.refundFeeCents / 100],
    ["chargebackFeeDollars", "Chargeback fee ($)", config.chargebackFeeCents / 100],
    ["lateCancellationFeeDollars", "Late cancellation ($)", config.lateCancellationFeeCents / 100],
    ["paymentProcessingRatePercent", "Processing rate %", config.paymentProcessingRatePercent],
    ["paymentProcessingFixedCents", "Processing fixed (¢)", config.paymentProcessingFixedCents],
  ] as const;

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader><CardTitle>Ticketing fees</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const payload: Record<string, unknown> = { stripeConnectEnabled: fd.get("stripeConnect") === "on", visibility: fd.get("visibility"), reason: fd.get("reason") };
          for (const [name] of fields) payload[name] = fd.get(name);
          startTransition(async () => {
            const r = await updateTicketPricingAction(payload);
            if (!r.ok) toast.error(r.error); else toast.success("Ticketing config saved");
          });
        }}>
          {fields.map(([name, label, val]) => (
            <div key={name}><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type="number" step="any" defaultValue={val} className="mt-1" /></div>
          ))}
          <div><Label>Visibility</Label><select name="visibility" defaultValue={config.visibility} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">{["enabled","disabled","hidden","coming_soon","beta_only"].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="stripeConnect" defaultChecked={config.stripeConnectEnabled} /> Stripe Connect enabled</label>
          <Input name="reason" placeholder="Change reason" className="sm:col-span-2" />
          <Button type="submit" disabled={pending} className="sm:col-span-3 w-fit">Save ticketing config</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AdminAgencyPlansPanel({ plans }: { plans: MonetizationAgencyPlan[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-6">
      {plans.map((plan) => (
        <Card key={plan.planId} className="glass-panel border-white/10">
          <CardHeader className="flex flex-row justify-between">
            <CardTitle>{plan.name}</CardTitle>
            {plan.isPopular ? <Badge>Popular</Badge> : null}
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const r = await updateAgencyPlanPricingAction({
                  planId: plan.planId,
                  priceDollars: Number(fd.get("price")),
                  annualPriceDollars: fd.get("annual") ? Number(fd.get("annual")) : undefined,
                  monthlyDiscountPercent: Number(fd.get("monthlyDisc")),
                  annualDiscountPercent: Number(fd.get("annualDisc")),
                  promoPriceDollars: fd.get("promo") ? Number(fd.get("promo")) : undefined,
                  trialDays: Number(fd.get("trial")),
                  artistLimit: fd.get("artists") ? Number(fd.get("artists")) : null,
                  staffLimit: fd.get("staff") ? Number(fd.get("staff")) : null,
                  promotionalCreditsDollars: Number(fd.get("credits")),
                  supportLevel: String(fd.get("support")),
                  visibility: String(fd.get("visibility")),
                  isPopular: fd.get("popular") === "on",
                  reason: String(fd.get("reason") || "") || undefined,
                });
                if (!r.ok) toast.error(r.error); else toast.success(`${plan.name} updated`);
              });
            }}>
              <div><Label>Monthly ($)</Label><Input name="price" type="number" step="0.01" defaultValue={plan.priceCents / 100} className="mt-1" /></div>
              <div><Label>Annual ($)</Label><Input name="annual" type="number" step="0.01" defaultValue={plan.annualPriceCents != null ? plan.annualPriceCents / 100 : ""} className="mt-1" /></div>
              <div><Label>Promo ($)</Label><Input name="promo" type="number" step="0.01" defaultValue={plan.promoPriceCents != null ? plan.promoPriceCents / 100 : ""} className="mt-1" /></div>
              <div><Label>Trial days</Label><Input name="trial" type="number" defaultValue={plan.trialDays} className="mt-1" /></div>
              <div><Label>Artist limit</Label><Input name="artists" type="number" defaultValue={plan.artistLimit ?? ""} className="mt-1" /></div>
              <div><Label>Staff limit</Label><Input name="staff" type="number" defaultValue={plan.staffLimit ?? ""} className="mt-1" /></div>
              <div><Label>Credits/mo ($)</Label><Input name="credits" type="number" step="0.01" defaultValue={plan.promotionalCreditsCents / 100} className="mt-1" /></div>
              <div><Label>Support</Label><Input name="support" defaultValue={plan.supportLevel} className="mt-1" /></div>
              <div><Label>Monthly disc %</Label><Input name="monthlyDisc" type="number" defaultValue={plan.monthlyDiscountPercent} className="mt-1" /></div>
              <div><Label>Annual disc %</Label><Input name="annualDisc" type="number" defaultValue={plan.annualDiscountPercent} className="mt-1" /></div>
              <div><Label>Visibility</Label><select name="visibility" defaultValue={plan.visibility} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="enabled">enabled</option><option value="hidden">hidden</option><option value="coming_soon">coming soon</option></select></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="popular" defaultChecked={plan.isPopular} /> Popular plan</label>
              <Input name="reason" placeholder="Change reason" className="sm:col-span-2" />
              <p className="text-xs text-muted-foreground sm:col-span-3">Venues: {plan.includedVenueTiers.join(", ")}</p>
              <Button type="submit" disabled={pending} size="sm">Save {plan.name}</Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminPromotionsPanel({ products }: { products: MonetizationPromotionProduct[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {products.map((p) => (
        <Card key={p.slug} className="glass-panel border-white/10">
          <CardContent className="pt-6">
            <form className="space-y-3" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const r = await updatePromotionProductAction({ slug: p.slug, priceDollars: Number(fd.get("price")), isActive: fd.get("active") === "on", visibility: String(fd.get("visibility")) });
                if (!r.ok) toast.error(r.error); else toast.success(`${p.name} updated`);
              });
            }}>
              <p className="font-medium">{p.name}</p>
              <Input name="price" type="number" step="0.01" defaultValue={p.priceCents / 100} />
              <select name="visibility" defaultValue={p.visibility} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="enabled">enabled</option><option value="disabled">disabled</option><option value="hidden">hidden</option></select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p.isActive} /> Active</label>
              <Button type="submit" size="sm" disabled={pending}>Save</Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminCreditsPanel({ credits, plans }: { credits: MonetizationMarketingCredits[]; plans: MonetizationAgencyPlan[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-4">
      {plans.map((plan) => {
        const credit = credits.find((c) => c.planId === plan.planId);
        return (
          <Card key={plan.planId} className="glass-panel border-white/10">
            <CardContent className="pt-6">
              <form className="grid gap-3 sm:grid-cols-4" onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                startTransition(async () => {
                  const r = await updateMarketingCreditsAction({
                    planId: plan.planId,
                    includedCreditsDollars: Number(fd.get("credits")),
                    expirationDays: fd.get("expiry") ? Number(fd.get("expiry")) : null,
                    rolloverEnabled: fd.get("rollover") === "on",
                    additionalCreditPriceDollars: Number(fd.get("addon")),
                  });
                  if (!r.ok) toast.error(r.error); else toast.success(`${plan.name} credits updated`);
                });
              }}>
                <p className="font-medium sm:col-span-4">{plan.name}</p>
                <div><Label>Included ($/mo)</Label><Input name="credits" type="number" step="0.01" defaultValue={(credit?.includedCreditsCents ?? plan.promotionalCreditsCents) / 100} className="mt-1" /></div>
                <div><Label>Expiration (days)</Label><Input name="expiry" type="number" defaultValue={credit?.expirationDays ?? ""} className="mt-1" /></div>
                <div><Label>Add-on price ($)</Label><Input name="addon" type="number" step="0.01" defaultValue={credit?.additionalCreditPriceCents != null ? credit.additionalCreditPriceCents / 100 : 1} className="mt-1" /></div>
                <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="rollover" defaultChecked={credit?.rolloverEnabled} /> Rollover</label>
                <Button type="submit" size="sm" disabled={pending}>Save</Button>
              </form>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function AdminCouponsPanel({ coupons }: { coupons: MonetizationCoupon[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-6">
      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle>Create coupon</CardTitle></CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-2" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const r = await createCouponAction({
                code: String(fd.get("code")),
                name: String(fd.get("name") || "") || undefined,
                discountType: String(fd.get("type")) as "percent" | "fixed",
                discountValue: Number(fd.get("value")),
                appliesTo: String(fd.get("applies")),
                usageLimit: fd.get("limit") ? Number(fd.get("limit")) : undefined,
              });
              if (!r.ok) toast.error(r.error); else { toast.success("Coupon created"); e.currentTarget.reset(); window.location.reload(); }
            });
          }}>
            <Input name="code" placeholder="CODE" required className="w-28" />
            <Input name="name" placeholder="Name" className="min-w-[140px]" />
            <select name="type" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"><option value="percent">%</option><option value="fixed">$</option></select>
            <Input name="value" type="number" placeholder="Value" required className="w-24" />
            <select name="applies" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">{["venue","agency","festival","referral","launch","seasonal","general"].map(v=><option key={v} value={v}>{v}</option>)}</select>
            <Input name="limit" type="number" placeholder="Usage limit" className="w-28" />
            <Button type="submit" size="sm" disabled={pending}>Create</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle>Active coupons</CardTitle></CardHeader>
        <CardContent>
          {coupons.length ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th>Code</th><th>Type</th><th>Value</th><th>Uses</th><th>Expires</th></tr></thead>
              <tbody>{coupons.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="py-2 font-mono">{c.code}</td>
                  <td className="capitalize">{c.discountType}</td>
                  <td>{c.discountType === "percent" ? `${c.discountValue}%` : formatCents(Math.round(c.discountValue * 100))}</td>
                  <td>{c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                  <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="text-sm text-muted-foreground">No coupons yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminTaxesPanel({ config }: { config: MonetizationTaxConfig }) {
  const [pending, startTransition] = useTransition();
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="pt-6">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const r = await updateTaxConfigAction({
              salesTaxPercent: Number(fd.get("sales")),
              vatPercent: Number(fd.get("vat")),
              gstPercent: Number(fd.get("gst")),
              processingFeeDisplay: String(fd.get("procDisplay")),
              platformFeeDisplay: String(fd.get("platDisplay")),
            });
            if (!r.ok) toast.error(r.error); else toast.success("Tax config saved");
          });
        }}>
          <div><Label>Sales tax %</Label><Input name="sales" type="number" step="0.01" defaultValue={config.salesTaxPercent} className="mt-1" /></div>
          <div><Label>VAT %</Label><Input name="vat" type="number" step="0.01" defaultValue={config.vatPercent} className="mt-1" /></div>
          <div><Label>GST %</Label><Input name="gst" type="number" step="0.01" defaultValue={config.gstPercent} className="mt-1" /></div>
          <div><Label>Processing fee display</Label><Input name="procDisplay" defaultValue={config.processingFeeDisplay} className="mt-1" /></div>
          <div><Label>Platform fee display</Label><Input name="platDisplay" defaultValue={config.platformFeeDisplay} className="mt-1" /></div>
          <Button type="submit" disabled={pending}>Save taxes & fees</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AdminPayoutsPanel({ config }: { config: MonetizationPayoutConfig }) {
  const [pending, startTransition] = useTransition();
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="pt-6">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const r = await updatePayoutConfigAction({
              payoutDelayDays: Number(fd.get("delay")),
              minPayoutDollars: Number(fd.get("min")),
              maxPayoutDollars: fd.get("max") ? Number(fd.get("max")) : null,
              reservePercent: Number(fd.get("reserve")),
              manualReviewThresholdDollars: Number(fd.get("threshold")),
              stripeConnectReady: fd.get("stripe") === "on",
            });
            if (!r.ok) toast.error(r.error); else toast.success("Payout settings saved");
          });
        }}>
          <div><Label>Payout delay (days)</Label><Input name="delay" type="number" defaultValue={config.payoutDelayDays} className="mt-1" /></div>
          <div><Label>Min payout ($)</Label><Input name="min" type="number" step="0.01" defaultValue={config.minPayoutCents / 100} className="mt-1" /></div>
          <div><Label>Max payout ($)</Label><Input name="max" type="number" step="0.01" defaultValue={config.maxPayoutCents != null ? config.maxPayoutCents / 100 : ""} className="mt-1" /></div>
          <div><Label>Reserve %</Label><Input name="reserve" type="number" step="0.01" defaultValue={config.reservePercent} className="mt-1" /></div>
          <div><Label>Manual review threshold ($)</Label><Input name="threshold" type="number" step="0.01" defaultValue={config.manualReviewThresholdCents / 100} className="mt-1" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="stripe" defaultChecked={config.stripeConnectReady} /> Stripe Connect ready</label>
          <Button type="submit" disabled={pending}>Save payout settings</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AdminFuturePricingPanel({ scheduled }: { scheduled: MonetizationScheduledPricing[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-6">
      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle>Schedule future pricing</CardTitle></CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-2" onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const r = await schedulePricingAction({
                category: String(fd.get("category")),
                entityKey: String(fd.get("entity")),
                changes: { value: Number(fd.get("value")) },
                effectiveAt: new Date(String(fd.get("effective"))).toISOString(),
              });
              if (!r.ok) toast.error(r.error); else { toast.success("Scheduled"); window.location.reload(); }
            });
          }}>
            <select name="category" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"><option value="venue">venue</option><option value="ticket">ticket</option><option value="agency">agency</option></select>
            <Input name="entity" placeholder="Entity key (e.g. community)" required className="w-40" />
            <Input name="value" type="number" placeholder="New value" required className="w-32" />
            <Input name="effective" type="datetime-local" required />
            <Button type="submit" size="sm" disabled={pending}>Schedule</Button>
          </form>
        </CardContent>
      </Card>
      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle>Scheduled changes</CardTitle></CardHeader>
        <CardContent>
          {scheduled.length ? (
            <ul className="space-y-2 text-sm">{scheduled.map((s) => (
              <li key={s.id} className="rounded-lg border border-white/5 px-3 py-2">
                <span className="font-medium capitalize">{s.category}</span> · {s.entityKey} · effective {new Date(s.effectiveAt).toLocaleString()}
              </li>
            ))}</ul>
          ) : <p className="text-sm text-muted-foreground">No scheduled pricing changes.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminPricingHistoryPanel({ history }: { history: MonetizationPricingHistoryRow[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader><CardTitle>Pricing history</CardTitle></CardHeader>
      <CardContent>
        {history.length ? (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th>When</th><th>Category</th><th>Entity</th><th>Field</th><th>Admin</th><th></th></tr></thead>
            <tbody>{history.map((h) => (
              <tr key={h.id} className="border-t border-white/5">
                <td className="py-2">{new Date(h.changedAt).toLocaleString()}</td>
                <td className="capitalize">{h.category}</td>
                <td>{h.entityKey}</td>
                <td>{h.fieldName}</td>
                <td>{h.adminName ?? "—"}</td>
                <td>{!h.rolledBack ? <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(async () => { const r = await rollbackPricingHistoryAction({ historyId: h.id }); if (!r.ok) toast.error(r.error); else { toast.success("Rolled back"); window.location.reload(); } })}>Rollback</Button> : <Badge variant="outline">Rolled back</Badge>}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <p className="text-sm text-muted-foreground">No pricing changes logged yet.</p>}
      </CardContent>
    </Card>
  );
}

export function AdminMonetizationOverview({ snapshot, analytics }: { snapshot: MonetizationSnapshot; analytics: MonetizationAnalytics }) {
  const kpis = [
    { label: "Venue tiers", value: String(snapshot.venues.length) },
    { label: "Agency plans", value: String(snapshot.agencyPlans.length) },
    { label: "Promotions", value: String(snapshot.promotions.length) },
    { label: "Ticket fee", value: `${snapshot.tickets.platformFeePercent}%` },
    { label: "Avg ticket revenue", value: formatCents(analytics.avgTicketRevenueCents) },
    { label: "Booking conversion", value: `${analytics.bookingConversionPercent}%` },
  ];
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label} className="glass-panel border-white/10">
            <CardContent className="pt-6"><p className="text-sm text-muted-foreground">{k.label}</p><p className="text-2xl font-semibold">{k.value}</p></CardContent>
          </Card>
        ))}
      </div>
      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle>Current venue booking fees</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">{snapshot.venues.map((v) => (
            <li key={v.tierId} className="flex justify-between rounded-lg border border-white/5 px-3 py-2">
              <span>{v.name}</span>
              <span className="font-medium tabular-nums">{v.requiresApproval ? "Custom" : formatCents(v.bookingFeeCents)}</span>
            </li>
          ))}</ul>
        </CardContent>
      </Card>
    </div>
  );
}
