"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Sparkles, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BackstagePassPage } from "@/lib/types/backstage-pass";
import { formatCents } from "@/lib/format";

export function BackstagePassFanView({ page }: { page: BackstagePassPage }) {
  const [loading, setLoading] = useState(false);
  const plan = page.plan;
  const member = page.member;

  async function subscribe() {
    if (!plan) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/backstage-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Subscribe failed");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start subscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl">{page.artistName} Backstage Pass</CardTitle>
          {plan?.description ? (
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {member?.isMember ? (
            <Badge className="bg-primary/20 text-primary">Active member</Badge>
          ) : plan ? (
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-3xl font-bold">{formatCents(plan.priceCentsMonthly)}</p>
              <span className="text-muted-foreground">/ month</span>
              <Button disabled={loading} onClick={() => void subscribe()}>
                Subscribe with Stripe
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">This artist has not published a Backstage Pass yet.</p>
          )}
          {member?.currentPeriodEnd ? (
            <p className="text-xs text-muted-foreground">
              Renews through {new Date(member.currentPeriodEnd).toLocaleDateString()}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {plan ? (
        <section>
          <h3 className="text-xl font-semibold">Included every month</h3>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {plan.perks.map((perk) => (
              <li key={perk} className="glass-panel rounded-lg px-4 py-3 text-sm">
                {perk}
              </li>
            ))}
          </ul>
          {plan.earlyTicketHours > 0 ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Ticket className="h-4 w-4" />
              Early ticket access — {plan.earlyTicketHours} hours before public on-sale
            </p>
          ) : null}
        </section>
      ) : null}

      {member?.isMember && member.discordUrl ? (
        <Button variant="outline" href={member.discordUrl}>
          Open member Discord
        </Button>
      ) : null}

      {member?.collectibles.length ? (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Digital collectibles</h3>
          </div>
          <ul className="space-y-2">
            {member.collectibles.map((c) => (
              <li key={c.id} className="glass-panel rounded-lg px-4 py-3 text-sm">
                <span className="font-medium">{c.name}</span>
                {c.earned ? (
                  <Badge className="ml-2 bg-primary/20 text-primary">Yours</Badge>
                ) : (
                  <span className="ml-2 text-muted-foreground">{c.description}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Announcements</h3>
        </div>
        {page.announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <ul className="space-y-3">
            {page.announcements.map((a) => (
              <li key={a.id} className="glass-panel rounded-xl p-4">
                <p className="font-medium">{a.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(a.publishedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {page.isOwner ? (
        <Button variant="outline" href="/artist/backstage">
          Manage Backstage Pass
        </Button>
      ) : null}
    </div>
  );
}
