import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RehearsalFanExperience } from "@/components/studio/rehearsal-fan-experience";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { canAccessRehearsal } from "@/lib/live/rehearsal-access";

type Props = {
  params: Promise<{ slug: string; eventSlug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, eventSlug } = await params;
  return { title: `Rehearsal · ${eventSlug}` };
}

export default async function RehearsalPage({ params, searchParams }: Props) {
  const { slug, eventSlug } = await params;
  const { token } = await searchParams;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, artists!inner(slug)")
    .eq("slug", eventSlug)
    .eq("artists.slug", slug)
    .maybeSingle();

  if (!event) notFound();

  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/artists/${slug}/events/${eventSlug}/rehearsal${token ? `?token=${token}` : ""}`);

  const access = await canAccessRehearsal(supabase, user.id, event.id, token);
  if (!access.allowed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Rehearsal access denied</h1>
        <p className="mt-2 text-muted-foreground">{access.reason ?? "You are not invited to this rehearsal."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <RehearsalFanExperience eventId={event.id} title={event.title} inviteToken={token} />
    </div>
  );
}
