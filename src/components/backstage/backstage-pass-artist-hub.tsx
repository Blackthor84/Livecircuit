"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  publishBackstageAnnouncementAction,
  saveBackstagePlanAction,
} from "@/lib/actions/backstage-pass";
import type { BackstageArtistHub } from "@/lib/types/backstage-pass";
import { formatCents } from "@/lib/format";

export function BackstagePassArtistHub({ hub }: { hub: BackstageArtistHub }) {
  const plan = hub.plans[0];
  const [name, setName] = useState(plan?.name ?? "Backstage Pass");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [price, setPrice] = useState(String((plan?.priceCentsMonthly ?? 999) / 100));
  const [discord, setDiscord] = useState(plan?.discordUrl ?? "");
  const [earlyHours, setEarlyHours] = useState(String(plan?.earlyTicketHours ?? 24));
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function savePlan() {
    setSaving(true);
    const cents = Math.round(parseFloat(price || "9.99") * 100);
    const result = await saveBackstagePlanAction({
      name,
      description,
      priceCentsMonthly: cents,
      discordUrl: discord || undefined,
      earlyTicketHours: parseInt(earlyHours, 10) || 24,
    });
    setSaving(false);
    if (!result.ok) toast.error(result.error);
    else toast.success("Backstage Pass updated");
  }

  async function publishAnnouncement() {
    if (!annTitle.trim() || !annBody.trim()) {
      toast.error("Title and body required");
      return;
    }
    const result = await publishBackstageAnnouncementAction({
      title: annTitle,
      body: annBody,
      membersOnly: true,
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Announcement published");
      setAnnTitle("");
      setAnnBody("");
    }
  }

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Active subscribers", value: hub.analytics.activeSubscribers },
          { label: "MRR", value: formatCents(hub.analytics.mrrCents) },
          { label: "New this month", value: hub.analytics.newThisMonth },
          { label: "All-time subs", value: hub.analytics.totalAllTime },
        ].map((stat) => (
          <Card key={stat.label} className="glass-panel border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Membership settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bp-name">Name</Label>
            <Input id="bp-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="bp-desc">Description</Label>
            <Textarea id="bp-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="bp-price">Monthly price (USD)</Label>
              <Input id="bp-price" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="bp-early">Early ticket hours</Label>
              <Input id="bp-early" value={earlyHours} onChange={(e) => setEarlyHours(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="bp-discord">Discord invite URL</Label>
              <Input id="bp-discord" value={discord} onChange={(e) => setDiscord(e.target.value)} />
            </div>
          </div>
          <Button disabled={saving} onClick={() => void savePlan()}>
            Save plan
          </Button>
          <Button variant="outline" href={`/artists/${hub.artistSlug}/backstage`}>
            Preview public page
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Member announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Title" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} />
          <Textarea placeholder="Message for subscribers" value={annBody} onChange={(e) => setAnnBody(e.target.value)} />
          <Button onClick={() => void publishAnnouncement()}>Publish</Button>
        </CardContent>
      </Card>

      {hub.recentSubscribers.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold">Recent subscribers</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {hub.recentSubscribers.map((s, i) => (
              <li key={`${s.displayName}-${i}`} className="glass-panel rounded-lg px-3 py-2">
                {s.displayName} · {new Date(s.since).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
