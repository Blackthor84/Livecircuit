"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Users, Radio, MessageCircle, PartyPopper, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createWatchPartyAction,
  followUserAction,
  joinWatchPartyAction,
  respondFriendRequestAction,
  sendFriendRequestAction,
  startFriendChatAndRedirectAction,
} from "@/lib/actions/friends";
import type { FriendsHubReport } from "@/lib/types/friends";

function PresenceDot({ status }: { status: "online" | "away" | "offline" }) {
  const color =
    status === "online" ? "bg-emerald-400" : status === "away" ? "bg-amber-400" : "bg-muted-foreground/40";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} aria-hidden />;
}

export function FriendsHubDashboard({ report }: { report: FriendsHubReport }) {
  const router = useRouter();
  const [partyTitle, setPartyTitle] = useState("Watch together");
  const [inviteCode, setInviteCode] = useState("");

  async function acceptRequest(requestId: string, accept: boolean) {
    const result = await respondFriendRequestAction({ requestId, accept });
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  async function addFriend(userId: string) {
    const result = await sendFriendRequestAction({ userId });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Friend request sent");
      router.refresh();
    }
  }

  async function follow(userId: string) {
    const result = await followUserAction({ userId });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Following");
      router.refresh();
    }
  }

  async function openChat(peerId: string) {
    const result = await startFriendChatAndRedirectAction(peerId);
    if (result && "ok" in result && !result.ok) toast.error(result.error);
  }

  async function createParty() {
    const result = await createWatchPartyAction({ title: partyTitle.trim() || "Watch together" });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(`Party created — code ${result.inviteCode}`);
      router.push(`/friends/party/${result.inviteCode}`);
    }
  }

  async function joinParty(e: React.FormEvent) {
    e.preventDefault();
    const result = await joinWatchPartyAction({ inviteCode: inviteCode.trim() });
    if (!result.ok) toast.error(result.error);
    else router.push(`/friends/party/${result.inviteCode}`);
  }

  return (
    <div className="space-y-10">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Users className="h-6 w-6 text-primary" />
            Friends
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-3xl font-bold tabular-nums">{report.friends.length}</p>
            <p className="text-muted-foreground">Friends</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums">{report.followingCount}</p>
            <p className="text-muted-foreground">Following</p>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums">{report.followersCount}</p>
            <p className="text-muted-foreground">Followers</p>
          </div>
          <div className="flex items-end">
            <Button size="sm" variant="outline" href="/friends/messages">
              <MessageCircle className="mr-2 h-4 w-4" />
              Friend messages
            </Button>
          </div>
        </CardContent>
      </Card>

      {(report.incoming.length > 0 || report.outgoing.length > 0) && (
        <section className="grid gap-6 lg:grid-cols-2">
          {report.incoming.length > 0 ? (
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Incoming requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.incoming.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <PresenceDot status={req.from.presence} />
                      <span className="font-medium">{req.from.displayName}</span>
                      {req.from.mutualFriends > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {req.from.mutualFriends} mutual
                        </span>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => acceptRequest(req.id, true)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => acceptRequest(req.id, false)}>
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
          {report.outgoing.length > 0 ? (
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Sent requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {report.outgoing.map((req) => (
                  <p key={req.id}>Waiting on {req.from.displayName}</p>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </section>
      )}

      <section>
        <h3 className="text-xl font-semibold">Your friends</h3>
        {report.friends.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Send requests from recommendations below or follow fans you meet at shows.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {report.friends.map((f) => (
              <li key={f.userId} className="glass-panel flex items-center justify-between gap-2 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <PresenceDot status={f.presence} />
                  <div>
                    <p className="font-medium">{f.displayName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{f.presence}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openChat(f.userId)}>
                  Message
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radio className="h-5 w-5" />
              Activity feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Friend activity will show up here.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {report.activity.map((a) => (
                  <li key={a.id} className="border-b border-white/5 pb-2 last:border-0">
                    <p className="font-medium">{a.actorName}</p>
                    <p className="text-muted-foreground">{a.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-lg">Shared upcoming events</CardTitle>
          </CardHeader>
          <CardContent>
            {report.sharedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                When you and a friend have tickets to the same show, it appears here.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {report.sharedEvents.map((ev) => (
                  <li key={`${ev.eventId}-${ev.friendName}`}>
                    <Link
                      href={
                        ev.artistSlug
                          ? `/artists/${ev.artistSlug}/events/${ev.eventSlug}`
                          : "#"
                      }
                      className="font-medium hover:text-primary"
                    >
                      {ev.eventTitle}
                    </Link>
                    <p className="text-muted-foreground">
                      with {ev.friendName} · {new Date(ev.scheduledAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PartyPopper className="h-5 w-5" />
              Watch together / party mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={partyTitle}
                onChange={(e) => setPartyTitle(e.target.value)}
                placeholder="Party name"
                className="bg-background/50"
              />
              <Button onClick={createParty}>Start party</Button>
            </div>
            <form onSubmit={joinParty} className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Invite code"
                className="bg-background/50"
              />
              <Button type="submit" variant="outline">
                Join with code
              </Button>
            </form>
            {report.watchParties.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {report.watchParties.map((p) => (
                  <li key={p.id}>
                    <Link href={`/friends/party/${p.inviteCode}`} className="text-primary hover:underline">
                      {p.title}
                    </Link>
                    <span className="text-muted-foreground"> · {p.memberCount} in room</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              Suggested friends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No suggestions yet — grow your graph by attending events.</p>
            ) : (
              report.recommendations.map((rec) => (
                <div
                  key={rec.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{rec.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {rec.reason}
                      {rec.mutualFriends > 0 ? ` · ${rec.mutualFriends} mutual` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => addFriend(rec.userId)}>
                      Add friend
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => follow(rec.userId)}>
                      Follow
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
