"use client";

import { useState, useTransition } from "react";
import { Megaphone, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AdminKpiGrid } from "@/components/admin/command-center/admin-kpi-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createCountdownScheduleAction,
  createMarketingCampaignAction,
  createReferralLinkAction,
  generateCampaignFromTemplateAction,
} from "@/lib/actions/agency-business-os";
import type { AgencyMarketingPayload } from "@/lib/agency/business-os-types";
import { formatCents } from "@/lib/format";

const CHANNELS = ["instagram", "facebook", "threads", "x", "linkedin", "tiktok", "email", "sms"] as const;

export function AgencyOsMarketingPanel({ orgId, data }: { orgId: string; data: AgencyMarketingPayload }) {
  const totalReferralRevenue = data.referrals.reduce((s, r) => s + r.revenue_cents, 0);
  const kpis = [
    { label: "Promotional credits", value: formatCents(data.creditBalanceCents) },
    { label: "Active campaigns", value: String(data.campaigns.filter((c) => c.status !== "archived").length) },
    { label: "Referral links", value: String(data.referrals.length) },
    { label: "Referral revenue", value: formatCents(totalReferralRevenue) },
  ];

  return (
    <Tabs defaultValue="campaigns" className="space-y-6">
      <TabsList className="flex h-auto flex-wrap gap-1 bg-transparent p-0">
        {["campaigns", "templates", "countdowns", "referrals", "graphics"].map((t) => (
          <TabsTrigger key={t} value={t} className="capitalize data-[state=active]:bg-primary/15 data-[state=active]:text-primary">{t}</TabsTrigger>
        ))}
      </TabsList>

      <AdminKpiGrid kpis={kpis} />

      <TabsContent value="campaigns" className="space-y-4">
        <CreateCampaignForm orgId={orgId} />
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="size-5" /> Campaigns</CardTitle></CardHeader>
          <CardContent>
            {data.campaigns.length ? (
              <ul className="space-y-2 text-sm">
                {data.campaigns.map((c) => (
                  <li key={c.id} className="flex justify-between rounded-lg border border-white/5 px-3 py-2">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">{c.channel}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{c.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">One-click campaign generation for events, artists, and sponsors.</p>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="templates" className="grid gap-4 md:grid-cols-2">
        {data.templates.map((t) => (
          <TemplateCard key={`${t.channel}-${t.label}`} orgId={orgId} template={t} />
        ))}
      </TabsContent>

      <TabsContent value="countdowns" className="space-y-4">
        <CountdownForm orgId={orgId} />
        {data.countdowns.map((c) => (
          <Card key={c.id} className="glass-panel border-white/10">
            <CardHeader><CardTitle>Countdown schedule</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">Event: {new Date(c.event_starts_at).toLocaleString()}</p>
              <div className="flex flex-wrap gap-2">
                {c.milestones.map((m) => (
                  <Badge key={m.label} variant="secondary">{m.label}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="referrals" className="space-y-4">
        <ReferralForm orgId={orgId} />
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle className="flex items-center gap-2"><Share2 className="size-5" /> Referral performance</CardTitle></CardHeader>
          <CardContent>
            {data.referrals.length ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted-foreground"><th className="pb-2">Code</th><th className="pb-2">Clicks</th><th className="pb-2">Sales</th><th className="pb-2">Revenue</th></tr></thead>
                <tbody>
                  {data.referrals.map((r) => (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="py-2 font-mono text-xs">{r.code}</td>
                      <td className="py-2">{r.clicks}</td>
                      <td className="py-2">{r.sales}</td>
                      <td className="py-2 tabular-nums">{formatCents(r.revenue_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-muted-foreground">Generate referral links for fans, influencers, and ambassadors.</p>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="graphics" className="space-y-4">
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-5" /> AI Graphics</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {["Event poster", "Instagram story", "Facebook cover", "Email header", "Digital flyer", "Countdown graphic", "VIP graphic", "Replay graphic"].map((label) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="font-medium">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">LiveCircuit-branded · ready for export</p>
                <Button size="sm" variant="secondary" className="mt-3" disabled>Generate</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function TemplateCard({ orgId, template }: { orgId: string; template: AgencyMarketingPayload["templates"][0] }) {
  const [pending, startTransition] = useTransition();
  return (
    <Card className="glass-panel border-white/10">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Badge variant="outline" className="mb-2 capitalize">{template.channel}</Badge>
            <p className="font-medium">{template.label}</p>
            <p className="mt-2 text-sm text-muted-foreground">{template.preview}</p>
          </div>
        </div>
        <Button size="sm" className="mt-4" disabled={pending} onClick={() => {
          startTransition(async () => {
            const r = await generateCampaignFromTemplateAction({ orgId, channel: template.channel, templatePreview: template.preview, name: template.label });
            if (!r.ok) toast.error(r.error); else toast.success("Campaign created from template");
          });
        }}>Use template</Button>
      </CardContent>
    </Card>
  );
}

function CreateCampaignForm({ orgId }: { orgId: string }) {
  const [pending, startTransition] = useTransition();
  const [channel, setChannel] = useState<string>("instagram");
  return (
    <form className="glass-panel flex flex-wrap gap-2 rounded-xl border border-white/10 p-4" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      startTransition(async () => {
        const r = await createMarketingCampaignAction({ orgId, name: String(fd.get("name")), channel, content: String(fd.get("content")) });
        if (!r.ok) toast.error(r.error); else { toast.success("Campaign created"); e.currentTarget.reset(); }
      });
    }}>
      <Input name="name" placeholder="Campaign name" required className="min-w-[140px] flex-1" />
      <select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={channel} onChange={(e) => setChannel(e.target.value)}>
        {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <Input name="content" placeholder="Post copy" required className="min-w-[200px] flex-[2]" />
      <Button type="submit" size="sm" disabled={pending}>Create</Button>
    </form>
  );
}

function CountdownForm({ orgId }: { orgId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form className="glass-panel flex flex-wrap gap-2 rounded-xl border border-white/10 p-4" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const raw = String(fd.get("startsAt"));
      startTransition(async () => {
        const r = await createCountdownScheduleAction({ orgId, eventStartsAt: new Date(raw).toISOString() });
        if (!r.ok) toast.error(r.error); else toast.success("Countdown schedule created (30d → replay)");
      });
    }}>
      <Input name="startsAt" type="datetime-local" required className="flex-1" />
      <Button type="submit" size="sm" disabled={pending}>Auto-generate countdown</Button>
    </form>
  );
}

function ReferralForm({ orgId }: { orgId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form className="glass-panel flex flex-wrap gap-2 rounded-xl border border-white/10 p-4" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      startTransition(async () => {
        const r = await createReferralLinkAction({ orgId, label: String(fd.get("label") || "") || undefined });
        if (!r.ok) toast.error(r.error); else { toast.success("Referral link created"); e.currentTarget.reset(); }
      });
    }}>
      <Input name="label" placeholder="Ambassador / influencer label" className="flex-1" />
      <Button type="submit" size="sm" disabled={pending}>Generate link</Button>
    </form>
  );
}
