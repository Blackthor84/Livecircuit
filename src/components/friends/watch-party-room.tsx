"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendWatchPartyMessageAction } from "@/lib/actions/friends";
import { createClient } from "@/lib/supabase/client";
import type { WatchPartyDetail, WatchPartyMessageRow } from "@/lib/data/friends";

export function WatchPartyRoom({
  party,
  userId,
  initialMessages,
}: {
  party: WatchPartyDetail;
  userId: string;
  initialMessages: WatchPartyMessageRow[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`watch-party-${party.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "watch_party_messages",
          filter: `party_id=eq.${party.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as WatchPartyMessageRow]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [party.id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const result = await sendWatchPartyMessageAction({ partyId: party.id, body: text.trim() });
    if (!result.ok) toast.error(result.error);
    else {
      setText("");
      router.refresh();
    }
  }

  const eventHref =
    party.artistSlug && party.eventSlug
      ? `/artists/${party.artistSlug}/events/${party.eventSlug}`
      : null;

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl p-5">
        <Button variant="ghost" size="sm" href="/friends">
          ← Friends hub
        </Button>
        <h2 className="mt-2 text-2xl font-bold">{party.title}</h2>
        <p className="text-sm text-muted-foreground">
          Host: {party.hostName} · Code: <span className="font-mono text-foreground">{party.inviteCode}</span>
        </p>
        {eventHref ? (
          <Button size="sm" className="mt-3" href={eventHref}>
            Open show
          </Button>
        ) : null}
        <p className="mt-4 text-sm">
          <span className="text-muted-foreground">In room: </span>
          {party.members.map((m) => m.displayName).join(", ")}
        </p>
      </div>

      <div className="flex h-[min(50vh,480px)] flex-col rounded-xl border border-white/10 bg-card/80">
        <div className="border-b border-white/10 px-4 py-2 text-sm font-medium">Party chat</div>
        <ScrollArea className="flex-1 px-4 py-3">
          <ul className="space-y-2 text-sm">
            {messages.map((m) => {
              const mine = m.sender_id === userId;
              return (
                <li
                  key={m.id}
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    mine ? "ml-auto bg-primary/20" : "bg-white/5"
                  }`}
                >
                  {m.body}
                </li>
              );
            })}
            <div ref={bottomRef} />
          </ul>
        </ScrollArea>
        <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-3">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Chat with the party…"
            className="bg-background/50"
          />
          <Button type="submit">Send</Button>
        </form>
      </div>
    </div>
  );
}
