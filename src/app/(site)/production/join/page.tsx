import { redirect } from "next/navigation";
import { acceptProducerInviteAction } from "@/lib/actions/producers";
import { getSessionUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ProductionJoinPage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Invalid producer invite</h1>
        <p className="mt-2 text-muted-foreground">This link is missing a token.</p>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=/production/join?token=${token}`);
  }

  const result = await acceptProducerInviteAction(token);
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Could not accept invite</h1>
        <p className="mt-2 text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  redirect(`/artist/events/${result.eventId}/production?view=studio`);
}
