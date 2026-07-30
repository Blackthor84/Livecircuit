import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { FoundingPartnerAdminPanel } from "@/components/sponsorship/founding-partner-program";
import {
  getFoundingPartnerProgramStats,
  listFoundingPartnerApplications,
  listFoundingPartnersPublic,
} from "@/lib/sponsorship/founding-partners";
import { listSponsorOrganizationsAdmin } from "@/lib/data/sponsors";

export const metadata: Metadata = { title: "Founding Partner Program — Admin" };

export default async function AdminFoundingPartnersPage() {
  const [stats, applications, partners, organizations] = await Promise.all([
    getFoundingPartnerProgramStats(),
    listFoundingPartnerApplications(),
    listFoundingPartnersPublic(),
    listSponsorOrganizationsAdmin(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Founding Partner Program"
        subtitle="Limited early-year recognition — default 50 slots, admin configurable."
      />
      <FoundingPartnerAdminPanel
        stats={stats}
        applications={applications}
        partners={partners}
        organizations={organizations.map((o) => ({ id: o.id as string, name: o.name as string }))}
      />
    </>
  );
}
