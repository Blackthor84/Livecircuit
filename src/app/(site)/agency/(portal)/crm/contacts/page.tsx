import type { Metadata } from "next";
import { AgencyCrmContactsPanel } from "@/components/agency/crm/agency-crm-contacts-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { listCrmContacts } from "@/lib/data/agency-crm";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "CRM Contacts" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AgencyCrmContactsPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : "";
  const org = sessionResult?.ok ? sessionResult.session.organization : null;

  const contacts =
    isSupabaseConfigured() && orgId
      ? await listCrmContacts(await createClient(), orgId)
      : [];

  return (
    <>
      <AgencyPageHeader
        title="Contacts"
        subtitle="Brands, sponsors, managers, venues, media, influencers, and talent buyers — your complete entertainment network."
        orgName={org?.name as string}
        verified={Boolean(org?.verified)}
      />
      {orgId ? (
        <AgencyCrmContactsPanel orgId={orgId} contacts={contacts} initialSearch={q ?? ""} />
      ) : null}
    </>
  );
}
