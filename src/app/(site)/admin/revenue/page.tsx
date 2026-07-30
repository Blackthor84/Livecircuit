import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminRevenueSummary } from "@/lib/data/admin-entities";
import { formatCents } from "@/lib/format";
import { getSponsorshipAnalyticsDashboard } from "@/lib/sponsorship/analytics";

export const metadata: Metadata = { title: "Revenue — Admin" };

export default async function AdminRevenuePage() {
  const [revenue, sponsorship] = await Promise.all([
    getAdminRevenueSummary(),
    getSponsorshipAnalyticsDashboard(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Revenue"
        subtitle="Platform GMV, ticket volume, tips, and premium sponsorship contracts."
      />
      <div className="space-y-8">
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Transaction revenue
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="glass-panel border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">GMV (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatCents(revenue.gmv30d)}</p>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">GMV (all time)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatCents(revenue.gmvAllTime)}</p>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">Tickets (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{revenue.tickets30d}</p>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">Tips (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatCents(revenue.tips30d)}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sponsorship revenue
            </h2>
            <Link href="/admin/sponsorships" className="text-sm text-primary hover:underline">
              Manage inventory →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="glass-panel border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">Active contract value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatCents(sponsorship.lifetimeRevenueCents)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Lifetime tracked revenue</p>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">Monthly sponsorship</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{formatCents(sponsorship.monthlyRevenueCents)}</p>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">Occupancy rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{sponsorship.occupancyRatePercent}%</p>
              </CardContent>
            </Card>
            <Card className="glass-panel border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-muted-foreground">Renewal rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{sponsorship.renewalRatePercent}%</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle>Revenue by arena</CardTitle>
            </CardHeader>
            <CardContent>
              {!sponsorship.revenueByVenue.length ? (
                <p className="text-sm text-muted-foreground">No active venue sponsorship contracts.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {sponsorship.revenueByVenue.map((row) => (
                    <li key={row.venueId} className="flex items-center justify-between gap-4">
                      <span>{row.venueName}</span>
                      <span className="font-medium tabular-nums">{formatCents(row.totalCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle>Top sponsors</CardTitle>
            </CardHeader>
            <CardContent>
              {!sponsorship.revenueBySponsor.length ? (
                <p className="text-sm text-muted-foreground">No sponsor organizations on active contracts.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {sponsorship.revenueBySponsor.map((row) => (
                    <li key={row.name} className="flex items-center justify-between gap-4">
                      <span>{row.name}</span>
                      <span className="font-medium tabular-nums">{formatCents(row.totalCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle>Revenue by state</CardTitle>
            </CardHeader>
            <CardContent>
              {!sponsorship.revenueByState.length ? (
                <p className="text-sm text-muted-foreground">No state-level sponsorship revenue yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {sponsorship.revenueByState.map((row) => (
                    <li key={row.stateCode} className="flex items-center justify-between gap-4">
                      <span>{row.stateCode}</span>
                      <span className="font-medium tabular-nums">{formatCents(row.totalCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle>Expiring contracts</CardTitle>
            </CardHeader>
            <CardContent>
              {!sponsorship.expiringContracts.length ? (
                <p className="text-sm text-muted-foreground">No contracts expiring within 30 days.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {sponsorship.expiringContracts.map((row) => (
                    <li key={row.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                      <p className="font-medium">{row.displayLabel}</p>
                      <p className="text-muted-foreground">
                        {row.venueName ? `${row.venueName} · ` : ""}ends {row.endsAt}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Revenue by order type (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {!revenue.ordersByType.length ? (
              <p className="text-sm text-muted-foreground">No paid orders in the last 30 days.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {revenue.ordersByType.map((row) => (
                  <li key={row.type} className="flex items-center justify-between gap-4">
                    <span className="capitalize">{row.type.replace(/_/g, " ")}</span>
                    <span className="font-medium tabular-nums">{formatCents(row.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
