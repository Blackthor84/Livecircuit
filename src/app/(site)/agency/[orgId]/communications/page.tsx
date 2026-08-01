import { AgencyCommunicationsPanel } from "@/components/agency/agency-communications-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { listAgencyConversations, listAgencyMessages } from "@/lib/data/agency-features";
import { getSessionUser } from "@/lib/auth/session";

type Props = { params: Promise<{ orgId: string }> };

export default async function AgencyCommunicationsPage({ params }: Props) {
  const { orgId } = await params;
  const user = await getSessionUser();
  const conversations = await listAgencyConversations(orgId);
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
