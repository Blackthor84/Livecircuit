"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { sendBackstageChatAction } from "@/lib/actions/producers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles?: { display_name: string | null; username: string | null } | null;
};

export function BackstageChat({ eventId }: { eventId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("backstage_chat_messages")
      .select("id, body, created_at, user_id, profiles(display_name, username)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as unknown as Message[]);
      });

    const channel = supabase
      .channel(`backstage-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "backstage_chat_messages",
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          const row = payload.new as Message;
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("id", row.user_id)
            .maybeSingle();
          setMessages((prev) => [...prev, { ...row, profiles: profile }]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const result = await sendBackstageChatAction({ eventId, body: text.trim() });
    if (!result.ok) toast.error(result.error);
    else setText("");
  }

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-xl border border-violet-500/20 bg-violet-500/5">
      <div className="flex items-center gap-2 border-b border-violet-500/20 px-4 py-3 text-sm font-medium">
        <Lock className="size-4 text-violet-300" />
        Private artist chat
      </div>
      <ScrollArea className="flex-1 px-4 py-3">
        <ul className="space-y-2 text-sm">
          {messages.map((message) => (
            <li key={message.id}>
              <span className="font-medium text-violet-200">
                {message.profiles?.display_name ?? message.profiles?.username ?? "Staff"}:
              </span>{" "}
              {message.body}
            </li>
          ))}
          <div ref={bottomRef} />
        </ul>
      </ScrollArea>
      <form onSubmit={(e) => void send(e)} className="flex gap-2 border-t border-violet-500/20 p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='e.g. "Move closer to the microphone."'
          maxLength={500}
        />
        <Button type="submit" size="sm">
          Send
        </Button>
      </form>
    </div>
  );
}
