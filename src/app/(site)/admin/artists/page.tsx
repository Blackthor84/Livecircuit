import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminEntityTable } from "@/components/admin/command-center/admin-entity-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAdminArtists } from "@/lib/data/admin-entities";
import {
  artistConnectStatusLabel,
  deriveArtistConnectStatus,
  normalizeRequirementsDue,
} from "@/lib/stripe/connect-status";

export const metadata: Metadata = { title: "Artists — Admin" };

export default async function AdminArtistsPage() {
  const artists = await listAdminArtists(100);

  return (
    <>
      <AdminPageHeader title="Artists" subtitle="Artist roster, verification status, and audience reach." />
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Artists ({artists.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminEntityTable
            rows={artists}
            emptyMessage="No artists found."
            columns={[
              {
                key: "name",
                header: "Artist",
                cell: (row) => (
                  <Link href={`/artists/${row.slug}`} className="font-medium hover:text-primary">
                    {row.stage_name}
                  </Link>
                ),
              },
              {
                key: "connect",
                header: "Stripe Connect",
                cell: (row) =>
                  artistConnectStatusLabel(
                    deriveArtistConnectStatus({
                      stripe_account_id: (row.stripe_account_id as string | null) ?? null,
                      stripe_onboarding_complete: Boolean(row.stripe_onboarding_complete),
                      stripe_charges_enabled: Boolean(row.stripe_charges_enabled),
                      stripe_payouts_enabled: Boolean(row.stripe_payouts_enabled),
                      stripe_payouts_manual: Boolean(row.stripe_payouts_manual),
                      stripe_payouts_schedule: (row.stripe_payouts_schedule as string | null) ?? null,
                      stripe_details_submitted: Boolean(row.stripe_details_submitted),
                      stripe_requirements_due: normalizeRequirementsDue(row.stripe_requirements_due),
                      stripe_connect_updated_at: (row.stripe_connect_updated_at as string | null) ?? null,
                    }),
                  ),
              },
              {
                key: "verified",
                header: "Verified",
                cell: (row) => (row.verified ? "Yes" : "No"),
              },
              {
                key: "featured",
                header: "Featured",
                cell: (row) => (row.featured ? "Yes" : "No"),
              },
              {
                key: "followers",
                header: "Followers",
                cell: (row) => row.follower_count?.toLocaleString() ?? "0",
                className: "tabular-nums",
              },
              {
                key: "listeners",
                header: "Monthly listeners",
                cell: (row) => row.monthly_listeners?.toLocaleString() ?? "0",
                className: "tabular-nums",
              },
            ]}
          />
        </CardContent>
      </Card>
    </>
  );
}
