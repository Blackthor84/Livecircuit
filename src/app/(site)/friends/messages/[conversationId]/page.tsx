import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FriendMessageThread } from "@/components/friends/friend-message-thread";
import { markFriendConversationReadAction } from "@/lib/actions/friends";
import { getSessionUser } from "@/lib/auth/session";
import { getFriendConversationMessages } from "@/lib/data/friends";

type Props = { params: Promise<{ conversationId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Friend chat" };
}

export default async function FriendConversationPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/friends/messages");

  const { conversationId } = await params;
  const { messages, meta } = await getFriendConversationMessages(conversationId, user.id);
  if (!meta) notFound();

  await markFriendConversationReadAction(conversationId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <FriendMessageThread
        conversationId={conversationId}
        userId={user.id}
        initialMessages={messages}
        meta={meta}
      />
    </div>
  );
}
