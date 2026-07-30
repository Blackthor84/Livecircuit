import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { VirtualProductionStudio } from "@/components/production/virtual-production-studio";
import { Button } from "@/components/ui/button";
import { openGreenRoomAction, getProductionStudioStateAction } from "@/lib/actions/studio";
import { requireRoles } from "@/lib/auth/guards";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants";
import { getArtistEventById, eventLivePath } from "@/lib/data/artist-events";
import { defaultChecklist } from "@/lib/streaming/studio/checklist";
import { createClient } from "@/lib/supabase/server";
import { getEventLiveAccess } from "@/lib/live/access";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ view?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const user = await getSessionUser();
  if (!user) return { title: "Virtual Production Studio" };
  const event = await getArtistEventById(user.id, eventId);
  return {
    title: event ? `Virtual Production Studio · ${event.title}` : "Virtual Production Studio",
  };
}

export default async function VirtualProductionStudioPage({ params, searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { eventId } = await params;
  const { view } = await searchParams;
  const initialView = view === "studio" ? "studio" : "green_room";
  const supabase = await createClient();
  const access = await getEventLiveAccess(supabase, user.id, eventId);

  if (access.mode !== "host" && access.mode !== "producer") {
    await requireRoles(["artist", ...ADMIN_ROLES], "/register?role=artist");
  }

  const event = await getArtistEventById(user.id, eventId);
  if (!event && access.mode === "host") notFound();

  const eventTitle =
    event?.title ??
    (
      await supabase.from("events").select("title, status, slug, artists(slug)").eq("id", eventId).maybeSingle()
    ).data?.title ??
    "Live event";

  const eventStatus = event?.status ?? access.status;
  if (eventStatus === "ended" || eventStatus === "cancelled") {
    redirect(event ? ROUTES.artistEvent(eventId) : ROUTES.artistDashboard);
  }

  if (eventStatus === "live" && event) {
    redirect(eventLivePath(event.artistSlug, event.slug));
  }

  if (access.mode === "host") {
    await openGreenRoomAction({ eventId });
  }

  const state = await getProductionStudioStateAction(eventId);
  if (!state.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p>{state.error}</p>
      </div>
    );
  }

  const livePath = event
    ? eventLivePath(event.artistSlug, event.slug)
    : `/artist/events/${eventId}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" href={ROUTES.artistEvent(eventId)}>
          ← Back to event
        </Button>
      </div>
      <VirtualProductionStudio
        eventId={eventId}
        eventTitle={eventTitle}
        livePath={livePath}
        access={state.access}
        scheduledAt={state.scheduledAt}
        accessMode={state.rehearsal?.access_mode ?? "self_only"}
        inviteUrl={state.inviteUrl}
        initialChecklist={state.rehearsal?.checklist ?? defaultChecklist()}
        producerChecklist={(state.rehearsal?.producer_checklist ?? {}) as Record<string, boolean>}
        goLiveChecklist={state.goLiveChecklist}
        initialFeedback={state.feedback}
        history={state.history}
        soundCheckActive={Boolean(state.rehearsal?.sound_check_active)}
        initialView={initialView}
      />
    </div>
  );
}
