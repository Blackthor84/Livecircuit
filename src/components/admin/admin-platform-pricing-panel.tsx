"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePlatformPricingAction } from "@/lib/actions/platform-pricing-admin";
import type { PlatformPricingConfig } from "@/lib/pricing/platform-pricing.server";

const TIERS = [
  { key: "community" as const, label: "Community Venue" },
  { key: "club" as const, label: "Club Venue" },
  { key: "theater" as const, label: "Theater" },
  { key: "arena" as const, label: "Arena" },
];

export function AdminPlatformPricingPanel({ config }: { config: PlatformPricingConfig }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await updatePlatformPricingAction({
            bookingFees: {
              community: Number(fd.get("community")),
              club: Number(fd.get("club")),
              theater: Number(fd.get("theater")),
              arena: Number(fd.get("arena")),
            },
            platformFeePercent: Number(fd.get("platformFeePercent")),
            paymentProcessingRatePercent: Number(fd.get("paymentProcessingRatePercent")),
            paymentProcessingFixedCents: Number(fd.get("paymentProcessingFixedCents")),
            stadiumRequiresApproval: fd.get("stadiumRequiresApproval") === "on",
          });
          if (!r.ok) toast.error(r.error);
          else toast.success("Pricing updated");
        });
      }}
    >
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Venue booking fees</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div key={tier.key}>
              <Label htmlFor={tier.key}>{tier.label}</Label>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-muted-foreground">$</span>
                <Input
                  id={tier.key}
                  name={tier.key}
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={config.bookingFees[tier.key]}
                  required
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Digital ticketing fees</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="platformFeePercent">Platform ticket fee (%)</Label>
            <Input id="platformFeePercent" name="platformFeePercent" type="number" min={0} max={100} step={0.1} defaultValue={config.platformFeePercent} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="paymentProcessingRatePercent">Processing rate (%)</Label>
            <Input id="paymentProcessingRatePercent" name="paymentProcessingRatePercent" type="number" min={0} max={100} step={0.1} defaultValue={config.paymentProcessingRatePercent} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="paymentProcessingFixedCents">Processing fixed (¢)</Label>
            <Input id="paymentProcessingFixedCents" name="paymentProcessingFixedCents" type="number" min={0} step={1} defaultValue={config.paymentProcessingFixedCents} required className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="stadiumRequiresApproval" defaultChecked={config.stadiumRequiresApproval} className="size-4 rounded border-input" />
            Stadium requires approval & custom pricing
          </label>
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save pricing"}</Button>
        </CardContent>
      </Card>

      {config.updatedAt ? (
        <p className="text-xs text-muted-foreground">Last updated {new Date(config.updatedAt).toLocaleString()}</p>
      ) : null}
    </form>
  );
}
