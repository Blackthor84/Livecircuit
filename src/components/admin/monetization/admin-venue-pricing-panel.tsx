"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateVenuePricingAction } from "@/lib/actions/monetization-admin";
import type { MonetizationVenueTier } from "@/lib/monetization/types";
import { formatCents } from "@/lib/format";

const VISIBILITY_OPTIONS = ["enabled", "disabled", "hidden", "coming_soon", "beta_only", "agency_only", "admin_only"];

export function AdminVenuePricingPanel({ tiers }: { tiers: MonetizationVenueTier[] }) {
  return (
    <div className="space-y-6">
      {tiers.map((tier) => (
        <VenueTierForm key={tier.tierId} tier={tier} />
      ))}
    </div>
  );
}

function VenueTierForm({ tier }: { tier: MonetizationVenueTier }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{tier.name}</CardTitle>
        <div className="flex gap-2">
          <Badge variant={tier.isActive ? "default" : "secondary"}>{tier.isActive ? "Active" : "Inactive"}</Badge>
          <Badge variant="outline" className="capitalize">{tier.visibility.replace(/_/g, " ")}</Badge>
          {tier.requiresApproval ? <Badge variant="outline">Approval required</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const r = await updateVenuePricingAction({
              tierId: tier.tierId,
              bookingFeeDollars: Number(fd.get("bookingFee")),
              minBookingFeeDollars: fd.get("minFee") ? Number(fd.get("minFee")) : undefined,
              maxBookingFeeDollars: fd.get("maxFee") ? Number(fd.get("maxFee")) : undefined,
              isActive: fd.get("isActive") === "on",
              visibility: String(fd.get("visibility")),
              earlyBirdDiscountPercent: Number(fd.get("earlyBird")),
              bulkBookingDiscountPercent: Number(fd.get("bulk")),
              agencyDiscountPercent: Number(fd.get("agency")),
              weekendMultiplier: Number(fd.get("weekend")),
              peakHourMultiplier: Number(fd.get("peak")),
              holidayMultiplier: Number(fd.get("holiday")),
              promoBookingFeeDollars: fd.get("promoFee") ? Number(fd.get("promoFee")) : undefined,
              scheduledFeeDollars: fd.get("scheduledFee") ? Number(fd.get("scheduledFee")) : undefined,
              scheduledEffectiveAt: String(fd.get("scheduledAt") || "") || undefined,
              requiresApproval: fd.get("requiresApproval") === "on",
              reason: String(fd.get("reason") || "") || undefined,
            });
            if (!r.ok) toast.error(r.error); else toast.success(`${tier.name} pricing saved`);
          });
        }}>
          <Field label="Booking fee ($)" name="bookingFee" type="number" step="0.01" defaultValue={tier.bookingFeeCents / 100} />
          <Field label="Min fee ($)" name="minFee" type="number" step="0.01" defaultValue={tier.minBookingFeeCents != null ? tier.minBookingFeeCents / 100 : ""} />
          <Field label="Max fee ($)" name="maxFee" type="number" step="0.01" defaultValue={tier.maxBookingFeeCents != null ? tier.maxBookingFeeCents / 100 : ""} />
          <Field label="Early bird discount (%)" name="earlyBird" type="number" defaultValue={tier.earlyBirdDiscountPercent} />
          <Field label="Bulk discount (%)" name="bulk" type="number" defaultValue={tier.bulkBookingDiscountPercent} />
          <Field label="Agency discount (%)" name="agency" type="number" defaultValue={tier.agencyDiscountPercent} />
          <Field label="Weekend multiplier" name="weekend" type="number" step="0.01" defaultValue={tier.weekendMultiplier} />
          <Field label="Peak hour multiplier" name="peak" type="number" step="0.01" defaultValue={tier.peakHourMultiplier} />
          <Field label="Holiday multiplier" name="holiday" type="number" step="0.01" defaultValue={tier.holidayMultiplier} />
          <Field label="Promo fee ($)" name="promoFee" type="number" step="0.01" defaultValue={tier.promoBookingFeeCents != null ? tier.promoBookingFeeCents / 100 : ""} />
          <Field label="Scheduled fee ($)" name="scheduledFee" type="number" step="0.01" defaultValue={tier.scheduledFeeCents != null ? tier.scheduledFeeCents / 100 : ""} />
          <Field label="Scheduled effective at" name="scheduledAt" type="datetime-local" defaultValue={tier.scheduledEffectiveAt?.slice(0, 16) ?? ""} />
          <div>
            <Label htmlFor={`vis-${tier.tierId}`}>Visibility</Label>
            <select id={`vis-${tier.tierId}`} name="visibility" defaultValue={tier.visibility} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              {VISIBILITY_OPTIONS.map((v) => <option key={v} value={v}>{v.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-4 md:col-span-2 lg:col-span-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={tier.isActive} /> Active</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiresApproval" defaultChecked={tier.requiresApproval} /> Requires approval</label>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor={`reason-${tier.tierId}`}>Change reason</Label>
            <Input id={`reason-${tier.tierId}`} name="reason" placeholder="Optional audit note" className="mt-1" />
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Effective {new Date(tier.effectiveAt).toLocaleString()} · Current {formatCents(tier.bookingFeeCents)}</p>
            <Button type="submit" size="sm" disabled={pending}>Save {tier.name}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, name, type, step, defaultValue }: { label: string; name: string; type: string; step?: string; defaultValue?: string | number }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} step={step} defaultValue={defaultValue} className="mt-1" />
    </div>
  );
}
