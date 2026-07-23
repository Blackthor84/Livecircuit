import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { WatchPartyRoom } from "@/components/friends/watch-party-room";
import { joinWatchPartyAction } from "@/lib/actions/friends";
import { getSessionUser } from "@/lib/auth/session";
import { getWatchPartyByCode, getWatchPartyMessages } from "@/lib/data/friends";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return { title: `Watch party ${code.toUpperCase()}` };
}

export default async function WatchPartyPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/friends");

  const { code } = await params;
  let party = await getWatchPartyByCode(code, user.id);
  if (!party) notFound();

  const isMember = party.members.some((m) => m.userId === user.id);
  if (!isMember) {
    await joinWatchPartyAction({ inviteCode: code });
    party = await getWatchPartyByCode(code, user.id);
    if (!party) notFound();
  }

  const messages = await getWatchPartyMessages(party.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <WatchPartyRoom party={party} userId={user.id} initialMessages={messages} />
    </div>
  );
}
