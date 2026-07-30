"use client";

import { LiveChat } from "@/components/live/live-room";
import { LiveReactionsOverlay } from "@/components/live/live-reactions-overlay";
import { StudioLiveKitRoom } from "@/components/studio/studio-livekit-room";
import { RehearsalFeedbackForm } from "@/components/studio/rehearsal-feedback-form";
import { Badge } from "@/components/ui/badge";

type Props = {
  eventId: string;
  title: string;
  inviteToken?: string | null;
};

export function RehearsalFanExperience({ eventId, title, inviteToken }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-500/40 text-amber-200">
            Private rehearsal
          </Badge>
          <span className="text-xs text-muted-foreground">
            You are previewing as a test fan — this is not public.
          </span>
        </div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="relative">
          <StudioLiveKitRoom eventId={eventId} role="audience" rehearsal inviteToken={inviteToken} />
          <LiveReactionsOverlay eventId={eventId} />
        </div>
        <RehearsalFeedbackForm eventId={eventId} />
      </div>
      <LiveChat eventId={eventId} canPost canModerate={false} rehearsalToken={inviteToken} />
    </div>
  );
}
