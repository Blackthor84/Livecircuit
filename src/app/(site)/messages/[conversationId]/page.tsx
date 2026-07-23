import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MessageThread } from "@/components/messages/message-thread";
import { markConversationReadAction } from "@/lib/actions/messaging";
import { getSessionUser } from "@/lib/auth/session";
import { getConversationMessages } from "@/lib/data/messaging";

type Props = { params: Promise<{ conversationId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Conversation" };
}

export default async function ConversationPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/messages");

  const { conversationId } = await params;
  const { messages, conversation } = await getConversationMessages(conversationId, user.id);
  if (!conversation) notFound();

  await markConversationReadAction(conversationId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <MessageThread
        conversationId={conversationId}
        userId={user.id}
        initialMessages={messages}
        conversation={conversation}
      />
    </div>
  );
}
