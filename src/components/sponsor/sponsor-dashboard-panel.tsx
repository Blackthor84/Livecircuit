"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SponsorAnalyticsDashboard } from "@/components/sponsor/sponsor-analytics-dashboard";
import {
  addSponsorMemberAction,
  createSponsorAdvertisementAction,
  createSponsorCampaignAction,
  createSponsorCouponAction,
  scheduleSponsorAdvertisementAction,
  updateSponsorCampaignStatusAction,
} from "@/lib/actions/sponsors";
import type { SponsorAnalyticsReport } from "@/lib/data/sponsor-analytics";
import type { SponsorDashboardData } from "@/lib/data/sponsors";

export function SponsorDashboardPanel({
  data,
  analytics,
}: {
  data: SponsorDashboardData;
  analytics: SponsorAnalyticsReport;
}) {
  const router = useRouter();
  const orgId = data.organization.id;

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    const result = await action();
    if (!result.ok) toast.error(result.error ?? "Failed");
    else {
      toast.success(success);
      router.refresh();
    }
  }

  return (
    <Tabs defaultValue="campaigns">
      <TabsList className="flex h-auto flex-wrap gap-1">
        <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        <TabsTrigger value="creatives">Creatives</TabsTrigger>
        <TabsTrigger value="placements">Placements</TabsTrigger>
        <TabsTrigger value="coupons">Coupons</TabsTrigger>
        <TabsTrigger value="contracts">Contracts</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
      </TabsList>

      <TabsContent value="analytics" className="mt-6">
        <SponsorAnalyticsDashboard report={analytics} organizationId={orgId} />
      </TabsContent>

      <TabsContent value="campaigns" className="mt-6 space-y-6">
        <form
          className="glass-panel grid gap-3 rounded-xl p-6 sm:grid-cols-2"
          action={(fd) =>
            void run(
              () =>
                createSponsorCampaignAction({
                  organizationId: orgId,
                  name: fd.get("name"),
                  budgetCents: fd.get("budgetCents") || null,
                }),
              "Campaign created"
            )
          }
        >
          <div className="space-y-2 sm:col-span-2">
            <Label>Campaign name</Label>
            <Input name="name" required placeholder="Summer naming flight" />
          </div>
          <div className="space-y-2">
            <Label>Budget (cents)</Label>
            <Input name="budgetCents" type="number" min={0} placeholder="500000" />
          </div>
          <Button type="submit" className="sm:col-span-2 w-fit">
            Create campaign
          </Button>
        </form>
        <ul className="space-y-3">
          {data.campaigns.map((c) => (
            <li key={c.id} className="glass-panel rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{c.name}</span>
                <Badge variant="secondary">{c.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["active", "paused", "completed"] as const).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void run(
                        () =>
                          updateSponsorCampaignStatusAction({
                            organizationId: orgId,
                            campaignId: c.id,
                            status,
                          }),
                        `Campaign ${status}`
                      )
                    }
                  >
                    Mark {status}
                  </Button>
                ))}
              </div>
            </li>
          ))}
          {!data.campaigns.length ? (
            <p className="text-sm text-muted-foreground">No campaigns yet.</p>
          ) : null}
        </ul>
      </TabsContent>

      <TabsContent value="creatives" className="mt-6">
        <form
          className="glass-panel grid gap-3 rounded-xl p-6"
          action={(fd) =>
            void run(
              () =>
                createSponsorAdvertisementAction({
                  organizationId: orgId,
                  campaignId: fd.get("campaignId"),
                  name: fd.get("name"),
                  assetUrl: fd.get("assetUrl") || null,
                  clickUrl: fd.get("clickUrl") || null,
                }),
              "Creative added"
            )
          }
        >
          <Label>Campaign ID</Label>
          <Input name="campaignId" required placeholder="UUID from campaigns tab" />
          <Label>Creative name</Label>
          <Input name="name" required />
          <Label>Asset URL</Label>
          <Input name="assetUrl" type="url" />
          <Label>Click URL</Label>
          <Input name="clickUrl" type="url" />
          <Button type="submit" className="w-fit">
            Add creative
          </Button>
        </form>
        <ul className="mt-6 space-y-2 text-sm">
          {data.advertisements.map((a) => (
            <li key={a.id} className="rounded-lg border border-white/10 p-3">
              {a.name} · campaign {a.campaign_id.slice(0, 8)}…
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="placements" className="mt-6">
        <form
          className="glass-panel grid gap-3 rounded-xl p-6"
          action={(fd) =>
            void run(
              () =>
                scheduleSponsorAdvertisementAction({
                  organizationId: orgId,
                  advertisementId: fd.get("advertisementId"),
                  billboardId: fd.get("billboardId"),
                  priority: fd.get("priority") || 0,
                }),
              "Placement scheduled"
            )
          }
        >
          <Label>Advertisement ID</Label>
          <Input name="advertisementId" required />
          <Label>Billboard ID</Label>
          <Input name="billboardId" required placeholder="Use platform-homepage or venue billboard UUID" />
          <Label>Priority</Label>
          <Input name="priority" type="number" defaultValue={10} />
          <Button type="submit" className="w-fit">
            Schedule placement
          </Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          Billboards: {data.billboards.slice(0, 5).map((b) => `${b.label} (${b.id.slice(0, 8)}…)`).join(", ")}
          {data.billboards.length > 5 ? "…" : ""}
        </p>
      </TabsContent>

      <TabsContent value="coupons" className="mt-6">
        <form
          className="glass-panel grid gap-3 rounded-xl p-6"
          action={(fd) =>
            void run(
              () =>
                createSponsorCouponAction({
                  organizationId: orgId,
                  campaignId: fd.get("campaignId"),
                  code: fd.get("code"),
                  title: fd.get("title"),
                  discountBps: fd.get("discountBps") || null,
                }),
              "Coupon created"
            )
          }
        >
          <Input name="campaignId" required placeholder="Campaign UUID" />
          <Input name="code" required placeholder="PROMO2026" />
          <Input name="title" required placeholder="20% off merch" />
          <Input name="discountBps" type="number" placeholder="Discount bps (2000 = 20%)" />
          <Button type="submit" className="w-fit">
            Create coupon
          </Button>
        </form>
        <ul className="mt-6 space-y-2 text-sm">
          {data.coupons.map((c) => (
            <li key={c.id} className="rounded-lg border border-white/10 p-3">
              <code>{c.code}</code> — {c.title} ({c.redemption_count} redemptions)
            </li>
          ))}
        </ul>
      </TabsContent>

      <TabsContent value="contracts" className="mt-6">
        <ul className="space-y-3">
          {data.sponsorships.map((s) => (
            <li key={s.id} className="glass-panel rounded-xl p-4">
              <div className="flex flex-wrap gap-2">
                <Badge>{s.product.replace(/_/g, " ")}</Badge>
                {s.is_founding_sponsor ? <Badge>Founding Sponsor</Badge> : null}
                {!s.is_active ? <Badge variant="outline">Inactive</Badge> : null}
              </div>
              <p className="mt-2 font-medium">{s.display_name ?? s.venues?.name ?? "Venue deal"}</p>
              {s.venues ? (
                <Button size="sm" variant="link" className="mt-1 px-0" href={`/livecircuit/venues/${s.venues.slug}`}>
                  View venue
                </Button>
              ) : null}
            </li>
          ))}
          {!data.sponsorships.length ? (
            <p className="text-sm text-muted-foreground">
              Contract lines are created by LiveCircuit admin (naming rights, founding tier, booths).
            </p>
          ) : null}
        </ul>
      </TabsContent>

      <TabsContent value="team" className="mt-6">
        <form
          className="glass-panel grid gap-3 rounded-xl p-6"
          action={(fd) =>
            void run(
              () =>
                addSponsorMemberAction({
                  organizationId: orgId,
                  userId: fd.get("userId"),
                  role: fd.get("role") || "viewer",
                }),
              "Member added"
            )
          }
        >
          <Label>User ID (UUID)</Label>
          <Input name="userId" required />
          <Label>Role</Label>
          <select name="role" className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="viewer">Viewer</option>
            <option value="analyst">Analyst</option>
            <option value="owner">Owner</option>
          </select>
          <Button type="submit" className="w-fit">
            Add member
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">{data.memberships.length} team member(s)</p>
      </TabsContent>
    </Tabs>
  );
}
