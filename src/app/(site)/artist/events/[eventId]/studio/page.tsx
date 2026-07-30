import { redirect } from "next/navigation";

type Props = { params: Promise<{ eventId: string }> };

export default async function StudioRedirectPage({ params }: Props) {
  const { eventId } = await params;
  redirect(`/artist/events/${eventId}/production`);
}
