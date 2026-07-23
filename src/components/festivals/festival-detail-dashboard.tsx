"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Award,
  CalendarClock,
  Map as MapIcon,
  Ticket,
  Trophy,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { purchaseFestivalPassAction } from "@/lib/actions/festivals";
import type { FestivalDetail } from "@/lib/types/virtual-festivals";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FestivalDetailDashboard({
  festival,
  signedIn,
}: {
  festival: FestivalDetail;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [buying, setBuying] = useState<string | null>(null);

  const days = useMemo(() => {
    const set = new Map<string, typeof festival.schedule>();
    for (const slot of festival.schedule) {
      const list = set.get(slot.dayLabel) ?? [];
      list.push(slot);
      set.set(slot.dayLabel, list);
    }
    return [...set.entries()];
  }, [festival.schedule]);

  async function buyPass(tierId: string) {
    setBuying(tierId);
    const result = await purchaseFestivalPassAction(tierId);
    setBuying(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.checkoutUrl) {
      router.push(result.checkoutUrl);
      return;
    }
    toast.success("Festival pass added");
    router.refresh();
  }

  return (
    <div className="space-y-10">
      <Card className="glass-panel overflow-hidden border-white/10">
        <div className="bg-gradient-to-br from-primary/25 to-transparent p-6 sm:p-8">
          <Badge className="mb-3 capitalize">{festival.status}</Badge>
          <h2 className="text-3xl font-bold">{festival.name}</h2>
          {festival.description ? (
            <p className="mt-3 max-w-2xl text-muted-foreground">{festival.description}</p>
          ) : null}
          {signedIn && festival.userPoints != null ? (
            <p className="mt-4 text-sm">
              Your festival score: <span className="font-semibold tabular-nums">{festival.userPoints}</span>
            </p>
          ) : null}
        </div>
      </Card>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Festival passes</h3>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {festival.passTiers.map((tier) => (
            <li key={tier.id} className="glass-panel rounded-xl p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{tier.name}</p>
                  {tier.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
                  ) : null}
                </div>
                {tier.isVipUpgrade ? <Badge>VIP</Badge> : null}
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {tier.perks.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-medium">{formatCents(tier.priceCents)}</span>
                {tier.owned ? (
                  <Badge className="bg-primary/20 text-primary">Owned</Badge>
                ) : signedIn ? (
                  <Button size="sm" disabled={buying === tier.id} onClick={() => void buyPass(tier.id)}>
                    {tier.isVipUpgrade ? "Upgrade" : "Get pass"}
                  </Button>
                ) : (
                  <Button size="sm" href={`/login?redirect=/festivals/${festival.slug}`}>
                    Sign in
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Interactive schedule</h3>
        </div>
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">Schedule publishing soon.</p>
        ) : (
          <div className="space-y-6">
            {days.map(([dayLabel, slots]) => (
              <div key={dayLabel}>
                <h4 className="font-medium">{dayLabel}</h4>
                <ul className="mt-3 space-y-2">
                  {slots.map((slot) => (
                    <li
                      key={slot.id}
                      className="glass-panel flex flex-col gap-2 rounded-xl p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{slot.title}</p>
                        <p className="text-muted-foreground">
                          {new Date(slot.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          {" – "}
                          {new Date(slot.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          {slot.venueName ? ` · ${slot.venueName}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {slot.slotType.replace("_", " ")}
                        </Badge>
                        {slot.isVipOnly ? <Badge>VIP</Badge> : null}
                        {slot.venueSlug ? (
                          <Button size="sm" variant="outline" href={`/livecircuit/venues/${slot.venueSlug}`}>
                            Venue
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Festival map</h3>
          </div>
          <div className="glass-panel relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
            {festival.mapPins.map((pin) => (
              <Link
                key={pin.venueSlug}
                href={`/livecircuit/venues/${pin.venueSlug}`}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pin.mapX}%`, top: `${pin.mapY}%` }}
              >
                <span className="flex flex-col items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs backdrop-blur-sm hover:bg-primary/30">
                  <span aria-hidden>📍</span>
                  {pin.label ?? pin.venueName}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Leaderboard</h3>
          </div>
          <Card className="glass-panel border-white/10">
            <CardContent className="space-y-2 pt-6">
              {festival.leaderboard.map((row) => (
                <div
                  key={row.userId}
                  className={cn(
                    "flex justify-between rounded-lg border border-white/10 px-3 py-2 text-sm",
                    row.isYou && "border-primary/40 bg-primary/5"
                  )}
                >
                  <span>
                    #{row.rank} {row.displayName}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{row.points}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Collectibles</h3>
          </div>
          <ul className="space-y-2">
            {festival.collectibles.map((c) => (
              <li key={c.id} className="glass-panel rounded-lg px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{c.name}</span>
                  <Badge variant="outline" className="capitalize">
                    {c.rarity}
                  </Badge>
                </div>
                {c.earned ? (
                  <p className="mt-1 text-primary">Collected</p>
                ) : (
                  <p className="mt-1 text-muted-foreground">{c.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Festival achievements</h3>
          </div>
          <ul className="space-y-2">
            {festival.achievements.map((a) => (
              <li key={a.id} className="glass-panel rounded-lg px-4 py-3 text-sm">
                <p className="font-medium">{a.name}</p>
                <p className="text-muted-foreground">{a.description}</p>
                {a.earned ? <Badge className="mt-2 bg-primary/20 text-primary">Earned</Badge> : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
