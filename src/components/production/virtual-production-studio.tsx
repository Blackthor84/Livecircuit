"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, GraduationCap, Lock, Sparkles } from "lucide-react";
import { AudioLab } from "@/components/production/audio-lab";
import { BackstageChat } from "@/components/production/backstage-chat";
import { NetworkLab } from "@/components/production/network-lab";
import { ProductionAlerts } from "@/components/production/production-alerts";
import { ProductionAudioMonitor } from "@/components/production/production-audio-monitor";
import { ProductionHistoryCard } from "@/components/production/production-history-panel";
import { ProducerChecklistPanel } from "@/components/production/producer-checklist";
import { VideoLab } from "@/components/production/video-lab";
import { VirtualGoLivePanel } from "@/components/production/virtual-go-live-panel";
import { LiveChat } from "@/components/live/live-room";
import { StudioLiveKitRoom } from "@/components/studio/studio-livekit-room";
import { StudioStreamHealth } from "@/components/studio/studio-stream-health";
import { StudioChecklistPanel } from "@/components/studio/studio-checklist";
import { StudioRehearsalInvites } from "@/components/studio/studio-rehearsal-invites";
import { StudioFanFeedback } from "@/components/studio/studio-fan-feedback";
import { StudioQuickTips } from "@/components/studio/studio-quick-tips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startSoundCheckAction, updateStudioChecklistAction } from "@/lib/actions/studio";
import { buildStreamCoachSuggestions } from "@/lib/streaming/studio/coach";
import { defaultChecklist } from "@/lib/streaming/studio/checklist";
import type { RehearsalFeedbackRow } from "@/lib/data/rehearsal";
import type { LiveAccessState } from "@/lib/live/access";
import {
  FAN_PREVIEW_DEVICES,
  type FanPreviewDevice,
  type GoLiveChecklist,
  type ProductionHistoryEntry,
  type ProductionStudioView,
} from "@/lib/production/studio";
import type { ProducerChecklist } from "@/lib/production/types";
import type {
  RehearsalAccessMode,
  StreamCoachSuggestion,
  StreamHealthMetrics,
  StudioChecklist,
} from "@/lib/streaming/studio/types";
import { healthStatusBg, healthStatusColor } from "@/lib/streaming/studio/analysis/stream-health";
import { toast } from "sonner";

function formatCountdown(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Props = {
  eventId: string;
  eventTitle: string;
  livePath: string;
  access: LiveAccessState;
  scheduledAt: string;
  accessMode: RehearsalAccessMode;
  inviteUrl: string | null;
  initialChecklist: StudioChecklist;
  producerChecklist: ProducerChecklist;
  goLiveChecklist: GoLiveChecklist;
  initialFeedback: RehearsalFeedbackRow[];
  history: ProductionHistoryEntry[];
  soundCheckActive?: boolean;
  initialView?: ProductionStudioView;
};

export function VirtualProductionStudio({
  eventId,
  eventTitle,
  livePath,
  access,
  scheduledAt,
  accessMode,
  inviteUrl,
  initialChecklist,
  producerChecklist,
  goLiveChecklist,
  initialFeedback,
  history,
  soundCheckActive = false,
  initialView = "green_room",
}: Props) {
  const [view, setView] = useState<ProductionStudioView>(initialView);
  const [checklist, setChecklist] = useState(initialChecklist);
  const [inviteLink, setInviteLink] = useState(inviteUrl);
  const [health, setHealth] = useState<StreamHealthMetrics | null>(null);
  const [coachTips, setCoachTips] = useState<StreamCoachSuggestion[]>([]);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [previewDevice, setPreviewDevice] = useState<FanPreviewDevice>("desktop");
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, Math.floor((new Date(scheduledAt).getTime() - Date.now()) / 1000))
  );
  const [soundCheck, setSoundCheck] = useState(soundCheckActive);

  const isHost = access.mode === "host";
  const streamRole =
    previewDevice === "artist"
      ? "host"
      : previewDevice === "moderator"
        ? "producer"
        : "audience";

  useEffect(() => {
    const tick = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((new Date(scheduledAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [scheduledAt]);

  useEffect(() => {
    setCoachTips(buildStreamCoachSuggestions({ health }));
  }, [health]);

  const persistChecklist = useCallback(
    async (next: StudioChecklist | ((current: StudioChecklist) => StudioChecklist)) => {
      setChecklist((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        void updateStudioChecklistAction({ eventId, checklist: resolved });
        return resolved;
      });
    },
    [eventId]
  );

  const markCheck = useCallback(
    (key: keyof StudioChecklist) => {
      void persistChecklist((current) => ({ ...current, [key]: true }));
    },
    [persistChecklist]
  );

  const previewWidth = useMemo(
    () => FAN_PREVIEW_DEVICES.find((d) => d.id === previewDevice)?.widthClass ?? "w-full",
    [previewDevice]
  );

  async function beginSoundCheck() {
    const result = await startSoundCheckAction({ eventId });
    if (!result.ok) toast.error(result.error);
    else {
      setSoundCheck(true);
      toast.success("Sound check started — private rehearsal active");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-violet-300" />
            <p className="text-sm uppercase tracking-wide text-violet-300">Virtual Production Studio</p>
          </div>
          <h1 className="text-2xl font-bold">{eventTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Private backstage — nothing here is visible to the public until Go Live.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="border-violet-500/40">
              {access.mode === "host" ? "Artist" : access.producerStaffRole ?? "Producer"}
            </Badge>
            {soundCheck ? <Badge className="bg-amber-500/90">Sound check active</Badge> : null}
          </div>
        </div>
        <Link href="/artist/streaming-academy" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <GraduationCap className="size-4" />
          Streaming Academy
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === "green_room" ? "default" : "outline"}
          onClick={() => setView("green_room")}
        >
          Green Room
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "studio" ? "default" : "outline"}
          onClick={() => setView("studio")}
        >
          Production Studio
        </Button>
      </div>

      <StudioQuickTips />

      {view === "green_room" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card className="border-violet-500/20 bg-violet-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-4" />
                  Countdown · {formatCountdown(secondsLeft)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <StudioLiveKitRoom
                  eventId={eventId}
                  role="host"
                  rehearsal
                  onHealthUpdate={setHealth}
                  onVideoElement={setVideoElement}
                  onAudioStream={setAudioStream}
                  onConnected={() => markCheck("camera_connected")}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => void beginSoundCheck()}>
                    Start sound check
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Technical checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <StudioChecklistPanel checklist={checklist} onChange={(next) => void persistChecklist(next)} />
              </CardContent>
            </Card>

            <AudioLab
              audioStream={audioStream}
              onTested={() => {
                markCheck("microphone_connected");
                markCheck("audio_tested");
                markCheck("test_recording_reviewed");
              }}
            />

            <NetworkLab onStable={() => markCheck("internet_stable")} />
          </div>

          <div className="space-y-6">
            <BackstageChat eventId={eventId} />
            <ProducerChecklistPanel eventId={eventId} checklist={producerChecklist} />
            <StudioRehearsalInvites
              eventId={eventId}
              accessMode={accessMode}
              inviteUrl={inviteLink}
              onUpdated={setInviteLink}
            />
            <StudioFanFeedback eventId={eventId} initialFeedback={initialFeedback} />
            <VirtualGoLivePanel
              eventId={eventId}
              livePath={livePath}
              checklist={goLiveChecklist}
              canGoLive={isHost}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {FAN_PREVIEW_DEVICES.map((device) => (
                    <Button
                      key={device.id}
                      type="button"
                      size="sm"
                      variant={previewDevice === device.id ? "default" : "outline"}
                      onClick={() => setPreviewDevice(device.id)}
                    >
                      {device.label}
                    </Button>
                  ))}
                </div>
                <div className={previewWidth}>
                  <StudioLiveKitRoom
                    eventId={eventId}
                    role={streamRole}
                    rehearsal
                    onHealthUpdate={setHealth}
                  />
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="video">
              <TabsList className="flex-wrap">
                <TabsTrigger value="video">Video Lab</TabsTrigger>
                <TabsTrigger value="audio">Audio Lab</TabsTrigger>
                <TabsTrigger value="network">Network Lab</TabsTrigger>
                <TabsTrigger value="health">Stream health</TabsTrigger>
                <TabsTrigger value="timeline">Event timeline</TabsTrigger>
                <TabsTrigger value="scenes">Scene manager</TabsTrigger>
              </TabsList>
              <TabsContent value="video">
                <VideoLab
                  videoElement={videoElement}
                  health={health}
                  onAcceptable={() => markCheck("video_tested")}
                />
              </TabsContent>
              <TabsContent value="audio">
                <AudioLab audioStream={audioStream} />
              </TabsContent>
              <TabsContent value="network">
                <NetworkLab />
              </TabsContent>
              <TabsContent value="health">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <StudioStreamHealth metrics={health} />
                    <ProductionAudioMonitor micConnected={Boolean(health?.microphoneSampleRate)} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="timeline">
                <Card>
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    <ul className="space-y-2">
                      <li>Green room opened</li>
                      {soundCheck ? <li>Sound check in progress</li> : null}
                      <li>Scheduled start: {new Date(scheduledAt).toLocaleString()}</li>
                      <li className="text-xs">Run-of-show cues — coming soon</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="scenes">
                <Card>
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    Scene Manager — switch between camera layouts and overlays. Coming soon.
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {coachTips.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="size-4" />
                    AI Stream Coach
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {coachTips.map((tip) => (
                    <div key={tip.id} className={`rounded-lg border px-3 py-2 text-sm ${healthStatusBg(tip.severity)}`}>
                      <span className={healthStatusColor(tip.severity)}>{tip.message}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <ProductionAlerts health={health} />
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
            <StudioFanFeedback eventId={eventId} initialFeedback={initialFeedback} />
            <ProductionHistoryCard history={history} />
            <VirtualGoLivePanel
              eventId={eventId}
              livePath={livePath}
              checklist={goLiveChecklist}
              canGoLive={isHost}
            />
          </div>
        </div>
      )}
    </div>
  );
}
