"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, Trash2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { REACTION_EMOJIS } from "@/lib/constants";
import {
  deleteChatMessageAction,
  muteChatUserAction,
  reportChatMessageAction,
  sendChatMessageAction,
} from "@/lib/actions/live-event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  body: string;
  created_at: string;
  is_vip_only?: boolean;
  is_deleted?: boolean;
  user_id?: string;
  profiles?: { display_name: string | null } | null;
};

type LiveChatProps = {
  eventId: string;
  canPost?: boolean;
  canModerate?: boolean;
  isVipViewer?: boolean;
};

export function LiveChat({
  eventId,
  canPost = true,
  canModerate = false,
  isVipViewer = false,
}: LiveChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("chat_messages")
      .select("id, body, created_at, is_vip_only, is_deleted, user_id, profiles(display_name)")
      .eq("event_id", eventId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as unknown as Message[]);
      });

    const channel = supabase
      .channel(`event-chat-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as Message;
          if (row.is_deleted) return;
          setMessages((prev) => [...prev, row]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as Message;
          if (row.is_deleted) {
            setMessages((prev) => prev.filter((m) => m.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const visibleMessages = messages.filter(
    (m) => !m.is_vip_only || isVipViewer || canModerate
  );

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !canPost) return;
    const result = await sendChatMessageAction({
      eventId,
      body: text.trim(),
      isVipOnly: vipOnly && isVipViewer,
    });
    if (!result.ok) toast.error(result.error);
    else setText("");
  }

  async function sendReaction(emoji: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("reactions").insert({
      event_id: eventId,
      user_id: user?.id ?? null,
      emoji,
    });
  }

  async function removeMessage(messageId: string) {
    const result = await deleteChatMessageAction({ eventId, messageId, action: "delete_message" });
    if (!result.ok) toast.error(result.error);
  }

  async function muteAuthor(messageId: string) {
    const result = await muteChatUserAction({
      eventId,
      messageId,
      action: "mute",
      muteMinutes: 30,
    });
    if (!result.ok) toast.error(result.error);
    else toast.success("User muted for 30 minutes");
  }

  async function reportMessage(messageId: string) {
    const reason = window.prompt("Why are you reporting this message?");
    if (!reason?.trim()) return;
    const result = await reportChatMessageAction({ eventId, messageId, reason: reason.trim() });
    if (!result.ok) toast.error(result.error);
    else toast.success("Report submitted");
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-xl border border-white/10 bg-card/80">
      <div className="border-b border-white/10 px-4 py-3 font-medium">Live chat</div>
      <ScrollArea className="flex-1 px-4 py-3">
        <ul className="space-y-3 text-sm">
          {visibleMessages.map((m) => (
            <li key={m.id} className="group flex gap-2">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-primary">
                  {m.profiles?.display_name ?? "Fan"}
                </span>
                {m.is_vip_only ? (
                  <span className="ml-2 text-xs uppercase text-accent">VIP</span>
                ) : null}
                <span className="text-muted-foreground"> · </span>
                {m.body}
              </div>
              <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                {canModerate ? (
                  <>
                    <button
                      type="button"
                      className="rounded p-1 hover:bg-white/10"
                      title="Delete message"
                      onClick={() => void removeMessage(m.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 hover:bg-white/10"
                      title="Mute user"
                      onClick={() => void muteAuthor(m.id)}
                    >
                      <VolumeX className="size-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="rounded p-1 hover:bg-white/10"
                    title="Report"
                    onClick={() => void reportMessage(m.id)}
                  >
                    <Flag className="size-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
          <div ref={bottomRef} />
        </ul>
      </ScrollArea>
      <div className="flex gap-1 border-t border-white/10 p-2">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="rounded-lg px-2 py-1 text-lg hover:bg-white/10"
            onClick={() => sendReaction(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      {canPost ? (
        <form onSubmit={sendMessage} className="space-y-2 border-t border-white/10 p-3">
          {isVipViewer ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={vipOnly}
                onChange={(e) => setVipOnly(e.target.checked)}
              />
              VIP-only message
            </label>
          ) : null}
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Say something nice…"
              className="bg-background/50"
            />
            <Button type="submit">Send</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

type PlayerProps = {
  title: string;
  status: string;
  waitingLabel?: string;
  deniedMessage?: string | null;
  streamNote?: string | null;
};

export function LivePlayerPlaceholder({
  title,
  status,
  waitingLabel,
  deniedMessage,
  streamNote,
}: PlayerProps) {
  return (
    <div
      className={cn(
        "relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-primary/20 via-background to-accent/10",
        status === "live" && "ring-2 ring-red-500/60"
      )}
    >
      {status === "live" && (
        <span className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          Live
        </span>
      )}
      {status === "waiting" && (
        <span className="absolute left-4 top-4 rounded-full bg-primary/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          Waiting room
        </span>
      )}
      <div className="text-center px-6">
        <p className="text-lg font-medium">{title}</p>
        {waitingLabel ? (
          <p className="mt-2 text-sm text-primary">{waitingLabel}</p>
        ) : null}
        {deniedMessage ? (
          <p className="mt-2 text-sm text-muted-foreground">{deniedMessage}</p>
        ) : null}
        {streamNote ? (
          <p className="mt-2 text-sm text-muted-foreground">{streamNote}</p>
        ) : (
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {status === "live"
              ? "Stream playback via configured provider."
              : "Streaming provider integration ready — connect Agora, LiveKit, or Mux via STREAMING_PROVIDER."}
          </p>
        )}
      </div>
    </div>
  );
}
