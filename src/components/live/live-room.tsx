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
  channel?: string;
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
  canAccessLocalChat?: boolean;
  tourCity?: string | null;
};

function ChatPanel({
  eventId,
  channel,
  canPost,
  canModerate,
  isVipViewer,
  title,
}: {
  eventId: string;
  channel: "global" | "local";
  canPost?: boolean;
  canModerate?: boolean;
  isVipViewer?: boolean;
  title: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("chat_messages")
      .select("id, body, created_at, channel, is_vip_only, is_deleted, user_id, profiles(display_name)")
      .eq("event_id", eventId)
      .eq("channel", channel)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as unknown as Message[]);
      });

    const realtimeChannel = supabase
      .channel(`event-chat-${eventId}-${channel}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as Message;
          if (row.is_deleted || row.channel !== channel) return;
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
      supabase.removeChannel(realtimeChannel);
    };
  }, [eventId, channel]);

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
      channel,
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/10 px-4 py-2 text-sm font-medium">{title}</div>
      <ScrollArea className="flex-1 px-4 py-3">
        <ul className="space-y-3 text-sm">
          {visibleMessages.map((m) => (
            <li key={m.id} className="group flex gap-2">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-primary">
                  {m.profiles?.display_name ?? "Fan"}
                </span>
                {m.is_vip_only ? (
                  <span className="ml-1 text-xs text-amber-300">VIP</span>
                ) : null}
                <p className="break-words text-foreground/90">{m.body}</p>
              </div>
              {canModerate ? (
                <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    className="rounded p-1 text-muted-foreground hover:bg-white/10"
                    onClick={() => void removeMessage(m.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-muted-foreground hover:bg-white/10"
                    onClick={() => void muteAuthor(m.id)}
                    aria-label="Mute"
                  >
                    <VolumeX className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-white/10 group-hover:opacity-100"
                  onClick={() => void reportMessage(m.id)}
                  aria-label="Report"
                >
                  <Flag className="size-3.5" />
                </button>
              )}
            </li>
          ))}
          <div ref={bottomRef} />
        </ul>
      </ScrollArea>
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex flex-wrap gap-1">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded px-1.5 py-0.5 text-lg hover:bg-white/10"
              onClick={() => void sendReaction(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={canPost ? "Say something…" : "Sign in to chat"}
            disabled={!canPost}
            maxLength={500}
          />
          <Button type="submit" size="sm" disabled={!canPost || !text.trim()}>
            Send
          </Button>
        </form>
        {isVipViewer ? (
          <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={vipOnly}
              onChange={(e) => setVipOnly(e.target.checked)}
            />
            VIP-only message
          </label>
        ) : null}
      </div>
    </div>
  );
}

export function LiveChat({
  eventId,
  canPost = true,
  canModerate = false,
  isVipViewer = false,
  canAccessLocalChat = false,
  tourCity,
}: LiveChatProps) {
  const [activeChannel, setActiveChannel] = useState<"global" | "local">("global");
  const localLabel = tourCity ? `${tourCity} Fans` : "Local Fans";

  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-xl border border-white/10 bg-card/80">
      <div className="border-b border-white/10 px-4 py-3 font-medium">Live chat</div>
      {canAccessLocalChat ? (
        <div className="flex border-b border-white/10">
          <button
            type="button"
            className={cn(
              "flex-1 px-3 py-2 text-sm transition",
              activeChannel === "global"
                ? "border-b-2 border-primary font-medium text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveChannel("global")}
          >
            Global
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 px-3 py-2 text-sm transition",
              activeChannel === "local"
                ? "border-b-2 border-emerald-500 font-medium text-emerald-300"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveChannel("local")}
          >
            {localLabel}
          </button>
        </div>
      ) : null}
      <ChatPanel
        eventId={eventId}
        channel={activeChannel}
        canPost={canPost}
        canModerate={canModerate}
        isVipViewer={isVipViewer}
        title={activeChannel === "local" ? localLabel : "Everyone watching"}
      />
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
      <div className="px-6 text-center">
        <p className="text-lg font-medium">{title}</p>
        {waitingLabel ? <p className="mt-2 text-sm text-primary">{waitingLabel}</p> : null}
        {deniedMessage ? <p className="mt-2 text-sm text-muted-foreground">{deniedMessage}</p> : null}
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
