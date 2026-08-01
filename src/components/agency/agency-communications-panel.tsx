"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Mic, Paperclip, Send, Square } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  createAgencyConversationAction,
  getAgencyAttachmentUploadPathAction,
  markAgencyMessagesReadAction,
  sendAgencyMessageAction,
} from "@/lib/actions/agency-features";
import type { AgencyConversation, AgencyMessage } from "@/lib/data/agency-features";
import { createClient } from "@/lib/supabase/client";

const PARTICIPANT_TYPES = [
  { value: "artist", label: "Artist" },
  { value: "fan", label: "Fan" },
  { value: "sponsor", label: "Sponsor" },
  { value: "team", label: "Internal team" },
  { value: "venue", label: "Venue operator" },
  { value: "support", label: "LiveCircuit support" },
] as const;

export function AgencyCommunicationsPanel({
  orgId,
  userId,
  conversations: initialConversations,
  initialMessages,
  initialConversationId,
}: {
  orgId: string;
  userId: string;
  conversations: AgencyConversation[];
  initialMessages: AgencyMessage[];
  initialConversationId?: string | null;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(initialConversationId ?? initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [recording, setRecording] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newType, setNewType] = useState<(typeof PARTICIPANT_TYPES)[number]["value"]>("team");
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; type: string }>>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!activeId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`agency-msg-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agency_messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as AgencyMessage]);
        }
      )
      .subscribe();

    void markAgencyMessagesReadAction({ orgId, conversationId: activeId });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, orgId]);

  async function uploadFile(file: File) {
    const pathResult = await getAgencyAttachmentUploadPathAction(orgId, file.name);
    if (!pathResult.ok) {
      toast.error(pathResult.error);
      return null;
    }

    const supabase = createClient();
    const { error } = await supabase.storage.from(pathResult.bucket).upload(pathResult.path, file, { upsert: false });
    if (error) {
      toast.error(error.message);
      return null;
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(pathResult.bucket)
      .createSignedUrl(pathResult.path, 60 * 60 * 24 * 7);

    if (signError || !signed?.signedUrl) {
      toast.error(signError?.message ?? "Failed to sign attachment URL");
      return null;
    }

    return { url: signed.signedUrl, name: file.name, type: file.type };
  }

  async function handleFileSelect(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const uploaded = await uploadFile(file);
      if (uploaded) setAttachments((prev) => [...prev, uploaded]);
    }
  }

  async function startVoiceNote() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
        const uploaded = await uploadFile(file);
        if (uploaded) setAttachments((prev) => [...prev, uploaded]);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone access required for voice notes");
    }
  }

  function stopVoiceNote() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    if (!text.trim() && !attachments.length) return;

    startTransition(async () => {
      const result = await sendAgencyMessageAction({
        orgId,
        conversationId: activeId,
        body: text.trim(),
        attachments,
      });
      if (!result.ok) toast.error(result.error);
      else {
        setText("");
        setAttachments([]);
      }
    });
  }

  function createConversation() {
    if (!newSubject.trim()) {
      toast.error("Subject required");
      return;
    }
    startTransition(async () => {
      const result = await createAgencyConversationAction({
        orgId,
        subject: newSubject.trim(),
        participantType: newType,
      });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Conversation created");
        setNewSubject("");
        if (result.conversationId) {
          setActiveId(result.conversationId);
          setConversations((prev) => [
            {
              id: result.conversationId!,
              subject: newSubject.trim(),
              participant_type: newType,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      }
    });
  }

  const activeConversation = conversations.find((c) => c.id === activeId);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Inbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-0 px-3 pb-3">
            {conversations.length ? (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setActiveId(conv.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    activeId === conv.id ? "border-primary/40 bg-primary/10" : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <p className="font-medium">{conv.subject ?? "Conversation"}</p>
                  <p className="mt-1 line-clamp-1 text-xs capitalize text-muted-foreground">
                    {conv.participant_type.replace("_", " ")}
                    {conv.last_message ? ` · ${conv.last_message}` : ""}
                  </p>
                </button>
              ))
            ) : (
              <p className="px-1 text-sm text-muted-foreground">No conversations yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New thread</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={newType}
                onChange={(e) => setNewType(e.target.value as typeof newType)}
              >
                {PARTICIPANT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <Input
              placeholder="Subject"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
            />
            <Button type="button" size="sm" className="w-full" disabled={pending} onClick={() => void createConversation()}>
              Start conversation
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel flex min-h-[520px] flex-col border-white/10">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{activeConversation?.subject ?? "Select a conversation"}</CardTitle>
            {activeConversation ? (
              <Badge variant="outline" className="capitalize">
                {activeConversation.participant_type}
              </Badge>
            ) : null}
          </div>
        </CardHeader>

        {activeId ? (
          <>
            <ScrollArea className="flex-1 px-4 py-4">
              <ul className="space-y-3 text-sm">
                {messages.map((m) => {
                  const mine = m.sender_id === userId;
                  return (
                    <li key={m.id} className={`max-w-[85%] ${mine ? "ml-auto" : ""}`}>
                      <div className={`rounded-lg px-3 py-2 ${mine ? "bg-primary/20" : "bg-white/5"}`}>
                        {m.body ? <p>{m.body}</p> : null}
                        {m.attachments?.length ? (
                          <ul className="mt-2 space-y-1">
                            {m.attachments.map((a) => (
                              <li key={a.url}>
                                {a.type.startsWith("audio/") ? (
                                  <audio controls src={a.url} className="max-w-full" />
                                ) : a.type.startsWith("image/") ? (
                                  <a href={a.url} target="_blank" rel="noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={a.url} alt={a.name} className="max-h-40 rounded-md" />
                                  </a>
                                ) : (
                                  <a href={a.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                    {a.name}
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(m.created_at).toLocaleString()}
                        {mine && m.read_at ? " · Read" : ""}
                      </p>
                    </li>
                  );
                })}
                <div ref={bottomRef} />
              </ul>
            </ScrollArea>

            {attachments.length ? (
              <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-2">
                {attachments.map((a) => (
                  <Badge key={a.url} variant="secondary">{a.name}</Badge>
                ))}
              </div>
            ) : null}

            <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={(e) => void handleFileSelect(e.target.files)}
              />
              <Button type="button" size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={recording ? "destructive" : "ghost"}
                onClick={() => (recording ? stopVoiceNote() : void startVoiceNote())}
              >
                {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
              </Button>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a message…"
                className="bg-background/50"
              />
              <Button type="submit" disabled={pending}>
                <Send className="size-4" />
              </Button>
            </form>
          </>
        ) : (
          <CardContent className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select or create a conversation to start messaging.
          </CardContent>
        )}
      </Card>
    </div>
  );
}
