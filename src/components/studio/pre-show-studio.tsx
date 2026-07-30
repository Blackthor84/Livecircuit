"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudioLiveKitRoom } from "@/components/studio/studio-livekit-room";
import { StudioAudioCheck } from "@/components/studio/studio-audio-check";
import { StudioLightingCheck } from "@/components/studio/studio-lighting-check";
import { StudioNetworkTest } from "@/components/studio/studio-network-test";
import { StudioStreamHealth } from "@/components/studio/studio-stream-health";
import { StudioChecklistPanel } from "@/components/studio/studio-checklist";
import { StudioRehearsalInvites } from "@/components/studio/studio-rehearsal-invites";
import { StudioFanFeedback } from "@/components/studio/studio-fan-feedback";
import { StudioGoLivePanel } from "@/components/studio/studio-go-live-panel";
import { StudioQuickTips } from "@/components/studio/studio-quick-tips";
import { updateStudioChecklistAction } from "@/lib/actions/studio";
import { buildStreamCoachSuggestions } from "@/lib/streaming/studio/coach";
import { defaultChecklist } from "@/lib/streaming/studio/checklist";
import type { RehearsalFeedbackRow } from "@/lib/data/rehearsal";
import type {
  RehearsalAccessMode,
  StreamCoachSuggestion,
  StreamHealthMetrics,
  StudioChecklist,
} from "@/lib/streaming/studio/types";
import { healthStatusBg, healthStatusColor } from "@/lib/streaming/studio/analysis/stream-health";

type Props = {
  eventId: string;
  eventTitle: string;
  livePath: string;
  accessMode: RehearsalAccessMode;
  inviteUrl: string | null;
  initialChecklist: StudioChecklist;
  initialFeedback: RehearsalFeedbackRow[];
};

export function PreShowStudio({
  eventId,
  eventTitle,
  livePath,
  accessMode,
  inviteUrl,
  initialChecklist,
  initialFeedback,
}: Props) {
  const [checklist, setChecklist] = useState<StudioChecklist>(initialChecklist);
  const [inviteLink, setInviteLink] = useState(inviteUrl);
  const [health, setHealth] = useState<StreamHealthMetrics | null>(null);
  const [coachTips, setCoachTips] = useState<StreamCoachSuggestion[]>([]);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

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

  useEffect(() => {
    setCoachTips(
      buildStreamCoachSuggestions({
        health,
      })
    );
  }, [health]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-primary">Pre-Show Studio</p>
          <h1 className="text-2xl font-bold">{eventTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Test your show exactly as fans will experience it — nothing is public until Go Live.
          </p>
        </div>
        <Link
          href="/artist/streaming-academy"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <GraduationCap className="size-4" />
          Streaming Academy
        </Link>
      </div>

      <StudioQuickTips />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Camera preview</CardTitle>
            </CardHeader>
            <CardContent>
              <StudioLiveKitRoom
                eventId={eventId}
                role="host"
                rehearsal
                onHealthUpdate={setHealth}
                onVideoElement={setVideoElement}
                onAudioStream={setAudioStream}
                onConnected={() => markCheck("camera_connected")}
              />
            </CardContent>
          </Card>

          <Tabs defaultValue="audio">
            <TabsList className="flex-wrap">
              <TabsTrigger value="audio">Audio check</TabsTrigger>
              <TabsTrigger value="health">Stream health</TabsTrigger>
              <TabsTrigger value="network">Network test</TabsTrigger>
              <TabsTrigger value="lighting">Lighting check</TabsTrigger>
              <TabsTrigger value="fan">Fan preview</TabsTrigger>
            </TabsList>
            <TabsContent value="audio">
              <Card>
                <CardContent className="pt-6">
                  <StudioAudioCheck
                    audioStream={audioStream}
                    onTested={() => {
                      markCheck("microphone_connected");
                      markCheck("audio_tested");
                      markCheck("test_recording_reviewed");
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="health">
              <Card>
                <CardContent className="pt-6">
                  <StudioStreamHealth metrics={health} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="network">
              <Card>
                <CardContent className="pt-6">
                  <StudioNetworkTest onStable={() => markCheck("internet_stable")} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="lighting">
              <Card>
                <CardContent className="pt-6">
                  <StudioLightingCheck
                    videoElement={videoElement}
                    onAcceptable={() => {
                      markCheck("video_tested");
                      markCheck("lighting_acceptable");
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="fan">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Test fans see the same live page with chat and reactions — via your private invite link.
                  </p>
                  <StudioRehearsalInvites
                    eventId={eventId}
                    accessMode={accessMode}
                    inviteUrl={inviteLink}
                    onUpdated={setInviteLink}
                  />
                  <StudioFanFeedback eventId={eventId} initialFeedback={initialFeedback} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {coachTips.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4" />
                  Stream coach
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {coachTips.map((tip) => (
                  <div
                    key={tip.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${healthStatusBg(tip.severity)}`}
                  >
                    <span className={healthStatusColor(tip.severity)}>{tip.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pre-show checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <StudioChecklistPanel checklist={checklist} onChange={(next) => void persistChecklist(next)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Device settings</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Use the camera preview controls to switch cameras, mirror, fullscreen, and resolution.
              Audio device selection uses your browser&apos;s default microphone.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sound check invites</CardTitle>
            </CardHeader>
            <CardContent>
              <StudioRehearsalInvites
                eventId={eventId}
                accessMode={accessMode}
                inviteUrl={inviteLink}
                onUpdated={setInviteLink}
              />
            </CardContent>
          </Card>

          <StudioGoLivePanel eventId={eventId} checklist={checklist} livePath={livePath} />
        </div>
      </div>
    </div>
  );
}
