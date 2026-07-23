"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendFriendMessageAction } from "@/lib/actions/friends";
import { createClient } from "@/lib/supabase/client";
import type { FriendConversationMeta, FriendMessageRow } from "@/lib/data/friends";

export function FriendMessageThread({
  conversationId,
  userId,
  initialMessages,
  meta,
}: {
  conversationId: string;
  userId: string;
  initialMessages: FriendMessageRow[];
  meta: FriendConversationMeta;
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
      .channel(`friend-dm-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "friend_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as FriendMessageRow]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const result = await sendFriendMessageAction({ conversationId, body: text.trim() });
    if (!result.ok) toast.error(result.error);
    else {
      setText("");
      router.refresh();
    }
  }

  return (
    <div className="flex h-[min(70vh,640px)] flex-col rounded-xl border border-white/10 bg-card/80">
      <div className="border-b border-white/10 px-4 py-3">
        <Button variant="ghost" size="sm" href="/friends/messages">
          ← Chats
        </Button>
        <p className="mt-1 font-medium">{meta.peerName}</p>
      </div>
      <ScrollArea className="flex-1 px-4 py-3">
        <ul className="space-y-3 text-sm">
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
          placeholder="Message your friend…"
          className="bg-background/50"
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}

export function FriendMessagesInbox({
  conversations,
}: {
  conversations: FriendConversationMeta[];
}) {
  if (!conversations.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No friend chats yet. Message someone from your{" "}
        <a href="/friends" className="text-primary hover:underline">
          friends list
        </a>
        .
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
      {conversations.map((c) => (
        <li key={c.id}>
          <a
            href={`/friends/messages/${c.id}`}
            className="flex flex-col gap-1 px-4 py-3 hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="font-medium">{c.peerName}</span>
            <span className="text-sm text-muted-foreground">
              {new Date(c.last_message_at).toLocaleString()}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
