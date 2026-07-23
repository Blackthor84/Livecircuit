"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Coins, Gift, ShoppingBag, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  claimDailyCoinsAction,
  equipCoinShopItemAction,
  purchaseCoinShopItemAction,
} from "@/lib/actions/coins";
import type { CoinsHubReport } from "@/lib/types/coins";

const CATEGORY_LABELS: Record<string, string> = {
  avatar: "Avatar",
  theme: "Themes",
  animation: "Animations",
  badge: "Badges",
  profile: "Profile",
  venue_collectible: "Venue collectibles",
  digital_merch: "Digital merch",
  reaction: "Reactions",
};

export function CoinsHubDashboard({ report }: { report: CoinsHubReport }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function claimDaily() {
    const result = await claimDailyCoinsAction();
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Daily coins claimed!");
      router.refresh();
    }
  }

  async function buy(itemId: string) {
    setBusyId(itemId);
    const result = await purchaseCoinShopItemAction({ itemId });
    setBusyId(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Added to your inventory");
      router.refresh();
    }
  }

  async function equip(itemId: string) {
    setBusyId(itemId);
    const result = await equipCoinShopItemAction({ itemId });
    setBusyId(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Equipped");
      router.refresh();
    }
  }

  const grouped = report.shop.reduce<Record<string, typeof report.shop>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-10">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Coins className="h-6 w-6 text-amber-400" />
            LiveCircuit Coins
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-4xl font-bold tabular-nums">{report.balance.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">
              Earned {report.lifetimeEarned.toLocaleString()} · Spent {report.lifetimeSpent.toLocaleString()}
            </p>
          </div>
          <Button onClick={claimDaily} disabled={!report.dailyClaimAvailable}>
            {report.dailyClaimAvailable ? "Claim daily bonus" : "Daily bonus claimed"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" />
              How to earn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {report.earnGuide.map((row) => (
                <li key={row.key} className="flex justify-between gap-4 border-b border-white/5 pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{row.label}</p>
                    <p className="text-muted-foreground">{row.description}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    +{row.amount}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5" />
              Invite friends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">Share your link — you both earn coins when they join.</p>
            <p className="break-all rounded-lg border border-white/10 bg-background/40 px-3 py-2 font-mono text-xs">
              {report.referralLink}
            </p>
            <p className="text-muted-foreground">
              Code: <span className="font-mono text-foreground">{report.referralCode}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(report.equipped).length > 0 ? (
        <section className="glass-panel rounded-xl p-5 text-sm">
          <p className="font-medium">Equipped now</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {Object.entries(report.equipped).map(([slot, name]) => (
              <Badge key={slot} variant="outline">
                {slot}: {name}
              </Badge>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <ShoppingBag className="h-5 w-5" />
          Coin shop
        </h3>
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-muted-foreground">
                {CATEGORY_LABELS[category] ?? category}
              </h4>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <li key={item.id} className="glass-panel rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <Badge className="shrink-0 tabular-nums">{item.priceCoins} LC</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.owned ? (
                        <>
                          {item.equipped ? (
                            <Badge variant="secondary">Equipped</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === item.id}
                              onClick={() => equip(item.id)}
                            >
                              Equip
                            </Button>
                          )}
                          <Badge variant="outline">Owned</Badge>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          disabled={busyId === item.id || report.balance < item.priceCoins}
                          onClick={() => buy(item.id)}
                        >
                          Buy
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold">Recent activity</h3>
        {report.recentTransactions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Earn coins from shows, reviews, and achievements.</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10 rounded-xl border border-white/10 text-sm">
            {report.recentTransactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p>{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <span className={`font-medium tabular-nums ${tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {tx.amount >= 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
