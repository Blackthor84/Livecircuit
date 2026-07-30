import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PostShowReport } from "@/components/production/post-show-report";
import { Button } from "@/components/ui/button";
import { getPostShowReportAction } from "@/lib/actions/producers";
import { getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants";
import { getArtistEventById } from "@/lib/data/artist-events";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const user = await getSessionUser();
  if (!user) return { title: "Post-show report" };
  const event = await getArtistEventById(user.id, eventId);
  return { title: event ? `Post-show report · ${event.title}` : "Post-show report" };
}

export default async function PostShowReportPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { eventId } = await params;
  const event = await getArtistEventById(user.id, eventId);

  const result = await getPostShowReportAction(eventId);
  if (!result.ok) {
    if (event) notFound();
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p>{result.error}</p>
        <Button className="mt-4" href={ROUTES.artistDashboard}>
          Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" href={ROUTES.artistEvent(eventId)}>
          ← Back to event
        </Button>
      </div>
      <PostShowReport report={result.report} />
    </div>
  );
}
