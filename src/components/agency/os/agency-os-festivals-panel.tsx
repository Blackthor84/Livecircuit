"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { CalendarRange, Plus, Ticket } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createAgencyFestivalAction } from "@/lib/actions/agency-business-os";
import type { AgencyFestivalRow } from "@/lib/agency/business-os-types";

export function AgencyOsFestivalsPanel({ orgId, festivals }: { orgId: string; festivals: AgencyFestivalRow[] }) {
  return (
    <div className="space-y-8">
      <CreateFestivalForm orgId={orgId} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {festivals.length ? festivals.map((f) => (
          <Card key={f.id} className="glass-panel border-white/10">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{f.name}</CardTitle>
                <Badge variant="outline" className="capitalize">{f.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarRange className="size-4" />
                {format(new Date(f.starts_at), "MMM d")} – {format(new Date(f.ends_at), "MMM d, yyyy")}
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Ticket className="size-4 text-primary" />
                {f.pass_count} pass types · {f.artist_count} artists
              </p>
              <Button href={`/agency/festivals/${f.id}`} size="sm" variant="secondary">Open festival builder</Button>
            </CardContent>
          </Card>
        )) : (
          <Card className="glass-panel border-white/10 md:col-span-2 xl:col-span-3">
            <CardContent className="py-12 text-center">
              <CalendarRange className="mx-auto mb-4 size-10 text-muted-foreground" />
              <p className="font-medium">Create your first digital festival</p>
              <p className="mt-1 text-sm text-muted-foreground">Multi-artist lineups, passes, sponsors, landing pages, and analytics in one builder.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CreateFestivalForm({ orgId }: { orgId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form className="glass-panel rounded-xl border border-white/10 p-4" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const name = String(fd.get("name"));
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const starts = String(fd.get("startsAt"));
      const ends = String(fd.get("endsAt"));
      startTransition(async () => {
        const r = await createAgencyFestivalAction({
          orgId, name, slug,
          startsAt: new Date(starts).toISOString(),
          endsAt: new Date(ends).toISOString(),
          description: String(fd.get("description") || "") || undefined,
        });
        if (!r.ok) toast.error(r.error);
        else {
          toast.success("Festival created");
          if (r.id) window.location.href = `/agency/festivals/${r.id}`;
        }
      });
    }}>
      <div className="mb-3 flex items-center gap-2">
        <Plus className="size-5 text-primary" />
        <p className="font-semibold">New festival</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input name="name" placeholder="Festival name" required className="min-w-[180px] flex-1" />
        <Input name="startsAt" type="datetime-local" required />
        <Input name="endsAt" type="datetime-local" required />
        <Input name="description" placeholder="Description (optional)" className="min-w-[200px] flex-[2]" />
        <Button type="submit" size="sm" disabled={pending}>Create festival</Button>
      </div>
    </form>
  );
}

export function AgencyOsFestivalDetailPanel({
  orgId, festival, rosterArtistIds,
}: {
  orgId: string;
  festival: import("@/lib/agency/business-os-types").AgencyFestivalDetail;
  rosterArtistIds: { id: string; stage_name: string }[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{festival.name}</h2>
          <p className="text-sm text-muted-foreground">
            {format(new Date(festival.starts_at), "PPP")} – {format(new Date(festival.ends_at), "PPP")}
          </p>
          {festival.description ? <p className="mt-2 max-w-2xl text-sm">{festival.description}</p> : null}
        </div>
        <Badge variant="outline" className="capitalize">{festival.status}</Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>Lineup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="flex flex-wrap gap-2" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const { addFestivalArtistAction } = await import("@/lib/actions/agency-business-os");
                const r = await addFestivalArtistAction({ orgId, festivalId: festival.id, artistId: String(fd.get("artistId")) });
                if (!r.ok) toast.error(r.error); else { toast.success("Artist added"); window.location.reload(); }
              });
            }}>
              <select name="artistId" required className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="">Select artist</option>
                {rosterArtistIds.map((a) => <option key={a.id} value={a.id}>{a.stage_name}</option>)}
              </select>
              <Button type="submit" size="sm" disabled={pending}>Add to lineup</Button>
            </form>
            {festival.artists.length ? (
              <ul className="space-y-2 text-sm">
                {festival.artists.map((a) => (
                  <li key={a.artist_id} className="flex justify-between rounded-lg border border-white/5 px-3 py-2">
                    <span>{a.stage_name}</span>
                    <span className="text-muted-foreground">{a.venue_name ?? "Digital stage"}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Add artists from your roster.</p>}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>Passes & tickets</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="flex flex-wrap gap-2" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const { addFestivalPassAction } = await import("@/lib/actions/agency-business-os");
                const r = await addFestivalPassAction({
                  orgId, festivalId: festival.id,
                  name: String(fd.get("passName")),
                  passType: String(fd.get("passType")),
                  priceCents: Math.round(parseFloat(String(fd.get("price"))) * 100),
                });
                if (!r.ok) toast.error(r.error); else { toast.success("Pass created"); window.location.reload(); }
              });
            }}>
              <Input name="passName" placeholder="Pass name" required className="flex-1" />
              <select name="passType" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="single">Single event</option>
                <option value="weekend">Weekend pass</option>
                <option value="vip">VIP</option>
                <option value="premium">Premium</option>
                <option value="festival">Festival pass</option>
              </select>
              <Input name="price" type="number" step="0.01" placeholder="Price $" required className="w-24" />
              <Button type="submit" size="sm" disabled={pending}>Add pass</Button>
            </form>
            {festival.passes.length ? (
              <ul className="space-y-2 text-sm">
                {festival.passes.map((p) => (
                  <li key={p.id} className="flex justify-between rounded-lg border border-white/5 px-3 py-2">
                    <span>{p.name} <span className="text-muted-foreground">({p.pass_type})</span></span>
                    <span className="tabular-nums">${(p.price_cents / 100).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Weekend passes, VIP packages, and single-event tickets.</p>}
          </CardContent>
        </Card>
      </div>

      {festival.sponsors.length ? (
        <Card className="glass-panel border-white/10">
          <CardHeader><CardTitle>Sponsors</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {festival.sponsors.map((s) => (
                <li key={s.id} className="flex justify-between rounded-lg border border-white/5 px-3 py-2">
                  <span>{s.package_name}</span>
                  <span className="tabular-nums">${(s.amount_cents / 100).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button href="/agency/festivals" variant="secondary" size="sm">← All festivals</Button>
        <Button href="/agency/marketing" size="sm">One-click festival marketing</Button>
      </div>
    </div>
  );
}
