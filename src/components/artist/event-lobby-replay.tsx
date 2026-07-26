"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { attachEventReplayAction, updateEventLobbyAction } from "@/lib/actions/lobby";
import { createClient } from "@/lib/supabase/client";
import type { StreamMetadata } from "@/lib/streaming/stream-metadata";

export function EventLobbySettings({
  eventId,
  metadata,
}: {
  eventId: string;
  metadata: StreamMetadata;
}) {
  const [message, setMessage] = useState(metadata.lobby_message ?? "");
  const [videoUrl, setVideoUrl] = useState(metadata.lobby_video_url ?? "");
  const [bannerUrl, setBannerUrl] = useState(metadata.lobby_banner_url ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const result = await updateEventLobbyAction({
      eventId,
      lobbyMessage: message,
      lobbyVideoUrl: videoUrl,
      lobbyBannerUrl: bannerUrl,
    });
    setLoading(false);
    if (!result.ok) toast.error(result.error);
    else toast.success("Lobby updated");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="lobby-message">Lobby message</Label>
        <Textarea
          id="lobby-message"
          rows={3}
          placeholder="Welcome fans — grab a drink and say hi in chat."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lobby-video">Preview video URL</Label>
        <Input
          id="lobby-video"
          placeholder="https://…/promo.mp4"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lobby-banner">Lobby banner URL</Label>
        <Input
          id="lobby-banner"
          placeholder="https://…/banner.jpg"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
        />
      </div>
      <Button type="button" disabled={loading} onClick={() => void save()}>
        {loading ? "Saving…" : "Save lobby"}
      </Button>
    </div>
  );
}

export function EventReplayUpload({
  eventId,
  recordingUrl,
  recordingStatus,
}: {
  eventId: string;
  recordingUrl: string | null;
  recordingStatus: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) {
      toast.error("Replay must be under 500MB");
      return;
    }
    if (!file.type.startsWith("video/")) {
      toast.error("Upload an MP4 or WebM replay");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "mp4";
    const path = `${eventId}/replay-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("event-recordings")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setLoading(false);
      toast.error(uploadError.message);
      return;
    }

    const result = await attachEventReplayAction({ eventId, storagePath: path });
    setLoading(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Replay published");
      window.location.reload();
    }
  }

  return (
    <div className="space-y-3">
      {recordingUrl ? (
        <p className="text-sm text-muted-foreground">
          Current replay:{" "}
          <a href={recordingUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
            Open recording
          </a>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Status: {recordingStatus === "processing" ? "Processing automatic recording…" : "No replay yet"}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={(e) => void onFileChange(e)}
      />
      <Button type="button" variant="outline" disabled={loading} onClick={() => inputRef.current?.click()}>
        {loading ? "Uploading…" : recordingUrl ? "Replace replay upload" : "Upload replay MP4"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Without LiveKit egress configured, upload a replay manually after the show. Automatic recordings
        appear here when S3 recording env vars are set.
      </p>
    </div>
  );
}
