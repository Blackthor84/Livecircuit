import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SponsorDashboardPanel } from "@/components/sponsor/sponsor-dashboard-panel";
import { SponsorBusinessProfilePanel } from "@/components/sponsorship/sponsorship-marketplace-panel";
import { getSessionUser } from "@/lib/auth/session";
import { getSponsorAnalyticsReport } from "@/lib/data/sponsor-analytics";
import { getSponsorDashboard } from "@/lib/data/sponsors";
import { getSponsorBusinessProfile } from "@/lib/sponsorship/sponsor-profile";

type Props = { params: Promise<{ orgId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgId } = await params;
  const user = await getSessionUser();
  if (!user) return { title: "Sponsor" };
  const data = await getSponsorDashboard(orgId, user.id);
  return { title: data ? `${data.organization.name} · Sponsor` : "Sponsor" };
}

export default async function SponsorOrgDashboardPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/sponsor/dashboard");

  const { orgId } = await params;
  const [data, analytics, businessProfile] = await Promise.all([
    getSponsorDashboard(orgId, user.id),
    getSponsorAnalyticsReport(orgId, user.id, 30),
    getSponsorBusinessProfile(orgId),
  ]);
  if (!data || !analytics) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/sponsor/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
        ← Organizations
      </Link>
      <h1 className="mt-2 text-3xl font-bold">{data.organization.name}</h1>
      <p className="mt-2 text-muted-foreground">
        Premium contracts, campaigns, analytics, waiting lists, and renewal opportunities.
      </p>
      <div className="mt-8 space-y-10">
        {businessProfile ? (
          <section>
            <h2 className="mb-4 text-xl font-semibold">Sponsor profile</h2>
            <SponsorBusinessProfilePanel profile={businessProfile} />
          </section>
        ) : null}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Campaigns & analytics</h2>
          <SponsorDashboardPanel data={data} analytics={analytics} />
        </section>
      </div>
    </div>
  );
}
