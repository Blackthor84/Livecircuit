"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/format";

type Preview = {
  description: string;
  unitAmountCents: number;
  currency: string;
  quantity: number;
  totalCents: number;
  tier: string;
  vipAvailable: boolean;
  availabilityError: string | null;
};

export function CheckoutForm() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") ?? "ticket";
  const [tier, setTier] = useState(searchParams.get("tier") ?? "general");
  const [tipDollars, setTipDollars] = useState(
    searchParams.get("tipAmountCents")
      ? String(Number(searchParams.get("tipAmountCents")) / 100)
      : "5"
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [loading, setLoading] = useState(false);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({ type });
    const event = searchParams.get("event");
    const tourStop = searchParams.get("tourStop");
    const product = searchParams.get("product");
    const artist = searchParams.get("artist");
    if (event) params.set("event", event);
    if (tourStop) params.set("tourStop", tourStop);
    if (product) params.set("product", product);
    if (artist) params.set("artist", artist);
    const festivalTier = searchParams.get("festivalTier");
    if (festivalTier) params.set("festivalTier", festivalTier);
    if (type === "ticket") params.set("tier", tier);
    if (type === "tip") {
      const cents = Math.round(parseFloat(tipDollars || "5") * 100);
      if (cents >= 100) params.set("tipAmountCents", String(cents));
    }
    return `/api/checkout/preview?${params.toString()}`;
  }, [searchParams, type, tier, tipDollars]);

  useEffect(() => {
    let cancelled = false;
    setLoadingPreview(true);
    void fetch(previewUrl)
      .then((r) => r.json())
      .then((data: Preview) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  async function startCheckout() {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        type,
        eventId: searchParams.get("event") ?? undefined,
        tourStopId: searchParams.get("tourStop") ?? undefined,
        productId: searchParams.get("product") ?? undefined,
        artistSlug: searchParams.get("artist") ?? undefined,
        festivalTierId: searchParams.get("festivalTier") ?? undefined,
      };
      if (type === "ticket") payload.tier = tier;
      if (type === "tip") {
        payload.tipAmountCents = Math.round(parseFloat(tipDollars || "5") * 100);
        payload.tipMessage = searchParams.get("tipMessage") ?? undefined;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout unavailable");
    } finally {
      setLoading(false);
    }
  }

  const blocked = Boolean(preview?.availabilityError);
  const total = preview?.totalCents ?? 2500;

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>Checkout</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadingPreview ? (
          <p className="text-sm text-muted-foreground">Loading price…</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground capitalize">
              {preview?.description ?? `${type} purchase via Stripe.`}
            </p>
            {type === "ticket" && preview?.vipAvailable ? (
              <div className="space-y-2">
                <Label>Ticket tier</Label>
                <Select value={tier} onValueChange={(v) => setTier(v ?? "general")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General admission</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {type === "tip" ? (
              <div className="space-y-2">
                <Label htmlFor="tip">Tip amount (USD)</Label>
                <Input
                  id="tip"
                  type="number"
                  min={1}
                  max={500}
                  step="0.5"
                  value={tipDollars}
                  onChange={(e) => setTipDollars(e.target.value)}
                />
              </div>
            ) : null}
            <p className="text-2xl font-semibold">{formatCents(total, preview?.currency ?? "USD")}</p>
            {preview?.availabilityError ? (
              <p className="text-sm text-destructive">{preview.availabilityError}</p>
            ) : null}
          </>
        )}
        <Button className="w-full" onClick={startCheckout} disabled={loading || loadingPreview || blocked}>
          {loading ? "Redirecting…" : "Pay with Stripe"}
        </Button>
      </CardContent>
    </Card>
  );
}
