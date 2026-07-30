import { redirect } from "next/navigation";

type Props = { params: Promise<{ eventId: string }> };

export default async function BoothRedirectPage({ params }: Props) {
  const { eventId } = await params;
  redirect(`/artist/events/${eventId}/production?view=studio`);
}
