import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireArtistContext } from "@/lib/auth/artist-context";
import { isStripeConfigured } from "@/lib/config/env";
import type { ArtistConnectStatus } from "@/lib/stripe/connect-status";
import {
  artistConnectStatusLabel,
  beginArtistConnectOnboarding,
  getArtistConnectStatus,
  refreshArtistConnectStatusFromStripe,
} from "@/lib/stripe/connect";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Payment setup — LiveCircuit" };

export default async function ArtistPaymentsReturnPage() {
  const ctx = await requireArtistContext();
  if (!ctx.ok) redirect("/login?next=/artist/settings");

  let status: ArtistConnectStatus = "not_connected";
  let syncError: string | null = null;

  if (isStripeConfigured()) {
    try {
      const admin = getSupabaseAdmin();
      status = await refreshArtistConnectStatusFromStripe(admin, ctx.artist.id);
    } catch (error) {
      syncError = error instanceof Error ? error.message : "Could not refresh payment status";
      const admin = getSupabaseAdmin();
      const current = await getArtistConnectStatus(admin, ctx.artist.id);
      status = current.status;
    }
  } else {
    const admin = getSupabaseAdmin();
    const current = await getArtistConnectStatus(admin, ctx.artist.id);
    status = current.status;
  }

  const headline =
    status === "ready"
      ? "Payments Ready"
      : status === "verification_pending"
        ? "Stripe is reviewing your payment information"
        : status === "restricted"
          ? "Additional Stripe verification required"
          : "Finish payment setup";

  const body =
    status === "ready"
      ? "Your Stripe account is connected. LiveCircuit will use this account for future ticket payouts."
      : status === "verification_pending"
        ? "Stripe is reviewing your details. You will be notified when payouts are enabled."
        : "Your Stripe session ended before setup was complete. Continue setup from artist settings.";

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">{headline}</h1>
      <p className="mt-3 text-muted-foreground">{body}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Status: {artistConnectStatusLabel(status)}
      </p>
      {syncError ? <p className="mt-2 text-sm text-amber-600">{syncError}</p> : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/artist/settings">Back to artist settings</Button>
        {status !== "ready" && isStripeConfigured() ? (
          <form
            action={async () => {
              "use server";
              const nextCtx = await requireArtistContext();
              if (!nextCtx.ok) redirect("/login?next=/artist/settings");
              const admin = getSupabaseAdmin();
              const { url } = await beginArtistConnectOnboarding({
                supabase: admin,
                artistId: nextCtx.artist.id,
                email: nextCtx.user.email ?? "",
                displayName: nextCtx.artist.stage_name,
                mode: "onboarding",
              });
              redirect(url);
            }}
          >
            <Button type="submit" variant="outline">
              Continue Stripe setup
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
