"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  archiveSponsorTierAction,
  updateFounderPricingAction,
  updateFounderProgramAction,
  updateSponsorTierAction,
} from "@/lib/actions/monetization-admin";
import type { MonetizationSnapshot } from "@/lib/monetization/types";
import { formatCents } from "@/lib/format";

export function AdminSponsorPricingPanel({ snapshot }: { snapshot: MonetizationSnapshot }) {
  return (
    <div className="space-y-6">
      {snapshot.sponsorTiers.map((tier) => (
        <Card key={tier.tierId} className="glass-panel border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{tier.name}</CardTitle>
            <Badge variant={tier.isActive ? "default" : "outline"}>{tier.visibility}</Badge>
          </CardHeader>
          <CardContent>
            <SponsorTierForm tier={tier} />
          </CardContent>
        </Card>
      ))}

      <Card className="glass-panel border-white/10">
        <CardHeader><CardTitle>Sponsorship Addons</CardTitle></CardHeader>
        <CardContent className="divide-y divide-white/5">
          {snapshot.sponsorAddons.map((addon) => (
            <div key={addon.slug} className="flex justify-between py-3 text-sm">
              <span>{addon.name}</span>
              <span className="text-muted-foreground">
                {formatCents(addon.monthlyPriceCents)}/mo · {formatCents(addon.annualPriceCents)}/yr
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SponsorTierForm({
  tier,
}: {
  tier: MonetizationSnapshot["sponsorTiers"][number];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await updateSponsorTierAction({
            tierId: tier.tierId,
            name: String(fd.get("name")),
            annualPriceDollars: Number(fd.get("annual")),
            monthlyPriceDollars: Number(fd.get("monthly")),
            regularAnnualPriceDollars: Number(fd.get("regularAnnual")),
            setupFeeDollars: Number(fd.get("setup")),
            futureGrowthPriceDollars: fd.get("futureGrowth") ? Number(fd.get("futureGrowth")) : undefined,
            futureEnterpriseLabel: String(fd.get("futureEnterprise") || "") || undefined,
            isActive: fd.get("isActive") === "on",
            visibility: String(fd.get("visibility")),
            reason: String(fd.get("reason") || "") || undefined,
          });
          if (!r.ok) toast.error(r.error);
          else toast.success(`${tier.name} saved`);
        });
      }}
    >
      <Field label="Name" name="name" defaultValue={tier.name} />
      <Field label="Annual ($)" name="annual" type="number" step="0.01" defaultValue={tier.annualPriceCents / 100} />
      <Field label="Monthly ($)" name="monthly" type="number" step="0.01" defaultValue={tier.monthlyPriceCents / 100} />
      <Field label="Regular annual ($)" name="regularAnnual" type="number" step="0.01" defaultValue={tier.regularAnnualPriceCents / 100} />
      <Field label="Setup fee ($)" name="setup" type="number" step="0.01" defaultValue={tier.setupFeeCents / 100} />
      <Field label="Future growth ($)" name="futureGrowth" type="number" step="0.01" defaultValue={tier.futureGrowthPriceCents != null ? tier.futureGrowthPriceCents / 100 : ""} />
      <Field label="Future enterprise label" name="futureEnterprise" defaultValue={tier.futureEnterpriseLabel ?? ""} />
      <div>
        <Label htmlFor={`vis-${tier.tierId}`}>Visibility</Label>
        <select id={`vis-${tier.tierId}`} name="visibility" defaultValue={tier.visibility} className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
          {["enabled", "disabled", "hidden", "coming_soon"].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={tier.isActive} /> Active
      </label>
      <Field label="Change reason" name="reason" />
      <div className="flex gap-2 md:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={pending}>Save</Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await archiveSponsorTierAction({ tierId: tier.tierId });
              if (!r.ok) toast.error(r.error);
              else toast.success("Tier archived");
            })
          }
        >
          Archive
        </Button>
      </div>
    </form>
  );
}

export function AdminFounderPricingPanel({ snapshot }: { snapshot: MonetizationSnapshot }) {
  const program = snapshot.founderProgram;

  return (
    <div className="space-y-6">
      {program ? (
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>Founder Program</CardTitle></CardHeader>
          <CardContent>
            <FounderProgramForm program={program} />
          </CardContent>
        </Card>
      ) : null}

      {snapshot.founderPricing.map((fp) => (
        <Card key={fp.tierId} className="glass-panel border-white/10">
          <CardHeader><CardTitle className="capitalize">{fp.tierId} Founder Pricing</CardTitle></CardHeader>
          <CardContent>
            <FounderTierForm fp={fp} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FounderProgramForm({ program }: { program: NonNullable<MonetizationSnapshot["founderProgram"]> }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await updateFounderProgramAction({
            badge: String(fd.get("badge")),
            headline: String(fd.get("headline")),
            subheadline: String(fd.get("subheadline")),
            sectionTitle: String(fd.get("sectionTitle")),
            timerMessage: String(fd.get("timerMessage")),
            legalNote: String(fd.get("legalNote")),
            expiresAt: String(fd.get("expiresAt") || "") || undefined,
            usageLimit: fd.get("usageLimit") ? Number(fd.get("usageLimit")) : undefined,
            isActive: fd.get("isActive") === "on",
          });
          if (!r.ok) toast.error(r.error);
          else toast.success("Founder program saved");
        });
      }}
    >
      <Field label="Badge" name="badge" defaultValue={program.badge} />
      <Field label="Headline" name="headline" defaultValue={program.headline} />
      <Field label="Subheadline" name="subheadline" defaultValue={program.subheadline} className="md:col-span-2" />
      <Field label="Section title" name="sectionTitle" defaultValue={program.sectionTitle} />
      <Field label="Timer message" name="timerMessage" defaultValue={program.timerMessage} className="md:col-span-2" />
      <Field label="Legal note" name="legalNote" defaultValue={program.legalNote} className="md:col-span-2" />
      <Field label="Expires at" name="expiresAt" type="datetime-local" defaultValue={program.expiresAt?.slice(0, 16) ?? ""} />
      <Field label="Usage limit" name="usageLimit" type="number" defaultValue="" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={program.isActive} /> Active
      </label>
      <Button type="submit" disabled={pending} className="md:col-span-2 w-fit">Save program</Button>
    </form>
  );
}

function FounderTierForm({ fp }: { fp: MonetizationSnapshot["founderPricing"][number] }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await updateFounderPricingAction({
            tierId: fp.tierId,
            founderAnnualDollars: Number(fd.get("founderAnnual")),
            founderMonthlyDollars: Number(fd.get("founderMonthly")),
            regularAnnualDollars: Number(fd.get("regularAnnual")),
            inviteOnly: fd.get("inviteOnly") === "on",
            lifetimePricing: fd.get("lifetimePricing") === "on",
            customGroup: String(fd.get("customGroup") || "") || undefined,
            expiresAt: String(fd.get("expiresAt") || "") || undefined,
            usageLimit: fd.get("usageLimit") ? Number(fd.get("usageLimit")) : undefined,
            isActive: fd.get("isActive") === "on",
            reason: String(fd.get("reason") || "") || undefined,
          });
          if (!r.ok) toast.error(r.error);
          else toast.success(`${fp.tierId} founder pricing saved`);
        });
      }}
    >
      <Field label="Founder annual ($)" name="founderAnnual" type="number" step="0.01" defaultValue={fp.founderAnnualCents / 100} />
      <Field label="Founder monthly ($)" name="founderMonthly" type="number" step="0.01" defaultValue={fp.founderMonthlyCents / 100} />
      <Field label="Regular annual ($)" name="regularAnnual" type="number" step="0.01" defaultValue={fp.regularAnnualCents / 100} />
      <Field label="Custom group" name="customGroup" defaultValue={fp.customGroup ?? ""} />
      <Field label="Expires at" name="expiresAt" type="datetime-local" defaultValue={fp.expiresAt?.slice(0, 16) ?? ""} />
      <Field label="Usage limit" name="usageLimit" type="number" defaultValue="" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="inviteOnly" defaultChecked={fp.inviteOnly} /> Invite only</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="lifetimePricing" defaultChecked={fp.lifetimePricing} /> Lifetime pricing</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={fp.isActive} /> Active</label>
      <Field label="Change reason" name="reason" className="md:col-span-2" />
      <Button type="submit" disabled={pending}>Save</Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  step,
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  defaultValue?: string | number;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} step={step} defaultValue={defaultValue} className="mt-1" />
    </div>
  );
}
