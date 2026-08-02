import type { Metadata } from "next";
import { AgencyCrmSearchPanel } from "@/components/agency/crm/agency-crm-search-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "CRM Search" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AgencyCrmSearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : "";
  const org = sessionResult?.ok ? sessionResult.session.organization : null;

  return (
    <>
      <AgencyPageHeader
        title="Search"
        subtitle="Find artists, events, sponsors, contacts, bookings, contracts, tasks, and notes across your CRM."
        orgName={org?.name as string}
        verified={Boolean(org?.verified)}
      />
      {orgId ? <AgencyCrmSearchPanel orgId={orgId} initialQuery={q ?? ""} /> : null}
    </>
  );
}
