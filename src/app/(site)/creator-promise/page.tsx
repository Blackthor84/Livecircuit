import type { Metadata } from "next";
import { CreatorPromisePageContent } from "@/components/marketing/creator-promise-sections";
import { buildCreatorPromiseFaq, buildVenueBookingFeesDisplay } from "@/lib/monetization/build-content.server";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";

export const metadata: Metadata = {
  title: "Creator Promise",
  description:
    "LiveCircuit's Artist First promise: keep 100% of merch, tips, and donations. Own your content. No exclusivity. Transparent digital ticketing.",
};

export default async function CreatorPromisePage() {
  const snapshot = await getMonetizationSnapshot();
  return (
    <CreatorPromisePageContent
      venueFees={buildVenueBookingFeesDisplay(snapshot)}
      faq={buildCreatorPromiseFaq(snapshot)}
    />
  );
}
