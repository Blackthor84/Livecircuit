import type { Metadata } from "next";
import { FriendMessagesInbox } from "@/components/friends/friend-message-thread";
import { requireUserProfile } from "@/lib/auth/guards";
import { listFriendConversations } from "@/lib/data/friends";

export const metadata: Metadata = { title: "Friend messages" };

export default async function FriendMessagesPage() {
  const { user } = await requireUserProfile();
  const conversations = await listFriendConversations(user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Friend messages</h1>
      <p className="mt-2 text-sm text-muted-foreground">Private chats with accepted friends.</p>
      <div className="mt-6">
        <FriendMessagesInbox conversations={conversations} />
      </div>
    </div>
  );
}
