import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { SponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";
import { buildSponsorPricingBundle } from "@/lib/monetization/sponsor-pricing.server";

export const metadata: Metadata = {
  title: {
    absolute: `Sponsor Visualizer | ${APP_NAME}`,
  },
  description:
    "Imagine your company's name on a LiveCircuit venue — enterprise sponsorship configurator with live personalization, executive flyover, and proposal generation.",
  openGraph: {
    title: `Sponsor Visualizer | ${APP_NAME}`,
    description:
      "LiveCircuit Enterprise Edition — flagship sponsorship sales platform for Fortune 500 partners.",
  },
};

export default async function SponsorVisualizerPage() {
  const snapshot = await getMonetizationSnapshot();
  const pricing = buildSponsorPricingBundle(snapshot);
  return <SponsorVisualizer pricing={pricing} />;
}
