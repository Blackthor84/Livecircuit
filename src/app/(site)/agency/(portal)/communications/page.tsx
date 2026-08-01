import { AgencyCommunicationsPanel } from "@/components/agency/agency-communications-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { loadAgencySessionForUser } from "@/lib/agency/session";
import { listAgencyConversations, listAgencyMessages } from "@/lib/data/agency-features";
import { getSessionUser } from "@/lib/auth/session";

export default async function AgencyCommunicationsPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : "";
  const conversations = orgId ? await listAgencyConversations(orgId) : [];
  const initialConversationId = conversations[0]?.id ?? null;
  const initialMessages =
    user && initialConversationId
      ? await listAgencyMessages(initialConversationId, user.id)
      : [];

  return (
    <>
      <AgencyPageHeader
        title="Communications"
        subtitle="Chat with artists, fans, sponsors, your internal team, venue operators, and LiveCircuit support."
      />
      {user ? (
        <AgencyCommunicationsPanel
          orgId={orgId}
          userId={user.id}
          conversations={conversations}
          initialMessages={initialMessages}
          initialConversationId={initialConversationId}
        />
      ) : null}
    </>
  );
}
