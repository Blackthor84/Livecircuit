import type { Metadata } from "next";
import { MessagesInbox } from "@/components/messages/message-thread";
import { requireUser } from "@/lib/auth/guards";
import { getArtistForUser } from "@/lib/auth/session";
import { listConversationsForUser } from "@/lib/data/messaging";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const [conversations, artist] = await Promise.all([
    listConversationsForUser(user.id),
    getArtistForUser(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Messages</h1>
      <p className="mt-2 text-muted-foreground">Direct messages with artists and fans.</p>
      <div className="mt-8">
        <MessagesInbox
          conversations={conversations}
          viewerId={user.id}
          isArtist={Boolean(artist)}
        />
      </div>
    </div>
  );
}
