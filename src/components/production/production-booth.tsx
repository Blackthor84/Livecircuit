"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Clapperboard,
  MessageSquare,
  MonitorPlay,
  Radio,
  Shield,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { BackstageChat } from "@/components/production/backstage-chat";
import { ProducerChecklistPanel } from "@/components/production/producer-checklist";
import { ProductionAlerts } from "@/components/production/production-alerts";
import { ProductionAudioMonitor } from "@/components/production/production-audio-monitor";
import { LiveChat } from "@/components/live/live-room";
import { StudioLiveKitRoom } from "@/components/studio/studio-livekit-room";
import { StudioStreamHealth } from "@/components/studio/studio-stream-health";
import { RehearsalFeedbackForm } from "@/components/studio/rehearsal-feedback-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  producerStartStreamAction,
  producerStopStreamAction,
} from "@/lib/actions/producers";
import type { LiveAccessState } from "@/lib/live/access";
import type { ProducerChecklist, ProducerPreviewMode } from "@/lib/production/types";
import { hasProducerPermission } from "@/lib/production/permissions";
import type { ProducerPermissions } from "@/lib/production/types";
import type { StreamHealthMetrics } from "@/lib/streaming/studio/types";

type Props = {
  eventId: string;
  eventTitle: string;
  access: LiveAccessState;
  checklist: ProducerChecklist;
  stats: {
    viewerCount: number;
    peakViewers: number;
    chatMessages: number;
    status: string;
  };
  isRehearsal?: boolean;
};

const PREVIEW_MODES: { id: ProducerPreviewMode; label: string }[] = [
  { id: "fan", label: "Fan view" },
  { id: "artist", label: "Artist view" },
  { id: "backstage", label: "Backstage" },
  { id: "moderator", label: "Moderator" },
  { id: "mobile_fan", label: "Mobile fan" },
  { id: "desktop_fan", label: "Desktop fan" },
];

export function ProductionBooth({
  eventId,
  eventTitle,
  access,
  checklist,
  stats,
  isRehearsal = false,
}: Props) {
  const [health, setHealth] = useState<StreamHealthMetrics | null>(null);
  const [previewMode, setPreviewMode] = useState<ProducerPreviewMode>("fan");
  const permissions = (access.producerPermissions ?? {}) as ProducerPermissions;
  const streamRole =
    previewMode === "fan" || previewMode === "mobile_fan" || previewMode === "desktop_fan"
      ? "audience"
      : previewMode === "artist"
        ? "host"
        : "producer";

  async function startStream() {
    const result = await producerStartStreamAction(eventId);
    if (!result.ok) toast.error(result.error);
    else toast.success("Public broadcast started");
  }

  async function stopStream() {
    const result = await producerStopStreamAction(eventId);
    if (!result.ok) toast.error(result.error);
    else toast.success("Stream ended");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-violet-300">Virtual Production Booth</p>
          <h1 className="text-2xl font-bold">{eventTitle}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{access.producerStaffRole ?? access.mode}</Badge>
            <Badge>{stats.status}</Badge>
            {isRehearsal ? (
              <Badge variant="outline" className="border-amber-500/40 text-amber-200">
                Private rehearsal
              </Badge>
            ) : null}
          </div>
        </div>
        <Link href="/artist/streaming-academy" className="text-sm text-primary hover:underline">
          Streaming Academy →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <Users className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Viewers</p>
              <p className="text-lg font-semibold">{stats.viewerCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <BarChart3 className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Peak</p>
              <p className="text-lg font-semibold">{stats.peakViewers}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <MessageSquare className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Chat messages</p>
              <p className="text-lg font-semibold">{stats.chatMessages}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MonitorPlay className="size-4" />
                Live preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {PREVIEW_MODES.map((mode) => (
                  <Button
                    key={mode.id}
                    type="button"
                    size="sm"
                    variant={previewMode === mode.id ? "default" : "outline"}
                    onClick={() => setPreviewMode(mode.id)}
                  >
                    {mode.label}
                  </Button>
                ))}
              </div>
              {previewMode === "backstage" ? (
                <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/40 text-sm text-muted-foreground">
                  Backstage view — camera off-stage monitoring
                </div>
              ) : (
                <div
                  className={
                    previewMode === "mobile_fan"
                      ? "mx-auto max-w-[375px]"
                      : previewMode === "desktop_fan"
                        ? "w-full"
                        : "w-full"
                  }
                >
                  <StudioLiveKitRoom
                    eventId={eventId}
                    role={streamRole}
                    rehearsal={isRehearsal}
                    onHealthUpdate={setHealth}
                  />
                </div>
              )}
              {health?.cameraResolution ? (
                <p className="text-xs text-muted-foreground">
                  Resolution: {health.cameraResolution}
                  {health.fps ? ` · ${health.fps} FPS` : ""}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Tabs defaultValue="health">
            <TabsList className="flex-wrap">
              <TabsTrigger value="health">Stream health</TabsTrigger>
              <TabsTrigger value="audio">Audio monitor</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="soundcheck">Sound check</TabsTrigger>
            </TabsList>
            <TabsContent value="health">
              <Card>
                <CardContent className="pt-6">
                  <StudioStreamHealth metrics={health} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="audio">
              <Card>
                <CardContent className="pt-6">
                  <ProductionAudioMonitor micConnected={Boolean(health?.microphoneSampleRate)} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="alerts">
              <Card>
                <CardContent className="pt-6">
                  <ProductionAlerts health={health} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="soundcheck">
              <Card>
                <CardContent className="pt-6">
                  <RehearsalFeedbackForm eventId={eventId} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-4" />
                Pre-show checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProducerChecklistPanel eventId={eventId} checklist={checklist} />
            </CardContent>
          </Card>

          <BackstageChat eventId={eventId} />

          {access.canModerate ? (
            <Card>
              <CardHeader>
                <CardTitle>Chat moderation</CardTitle>
              </CardHeader>
              <CardContent>
                <LiveChat eventId={eventId} canPost={false} canModerate />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clapperboard className="size-4" />
                Event control
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {hasProducerPermission(permissions, "start_stream") || access.mode === "host" ? (
                <Button type="button" size="sm" onClick={() => void startStream()}>
                  <Radio className="size-4" />
                  Go live
                </Button>
              ) : null}
              {hasProducerPermission(permissions, "stop_stream") || access.mode === "host" ? (
                <Button type="button" size="sm" variant="destructive" onClick={() => void stopStream()}>
                  End stream
                </Button>
              ) : null}
              {!hasProducerPermission(permissions, "start_stream") && access.mode === "producer" ? (
                <p className="text-xs text-muted-foreground">
                  Stream control not granted — contact the artist to enable permissions.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
