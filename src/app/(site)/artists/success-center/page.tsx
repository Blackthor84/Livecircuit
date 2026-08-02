import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { ArtistSuccessCenter } from "@/components/artists/success-center/artist-success-center";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";
import { getBusinessRulesSnapshot } from "@/lib/business-rules/rules-resolver.server";

export const metadata: Metadata = {
  title: { absolute: `Artist Success Center | ${APP_NAME}` },
  description:
    "Every great tour starts somewhere — interactive venue matching, smart pricing, earnings projections, and growth roadmap for performers.",
  openGraph: {
    title: `Artist Success Center Enterprise | ${APP_NAME}`,
    description:
      "Flagship artist onboarding experience — AI venue matchmaker, success simulator, and personalized growth plan.",
  },
};

export default async function ArtistSuccessCenterPage() {
  const [pricingSnapshot, rulesSnapshot] = await Promise.all([
    getMonetizationSnapshot(),
    getBusinessRulesSnapshot(),
  ]);
  return (
    <ArtistSuccessCenter pricingSnapshot={pricingSnapshot} rulesSnapshot={rulesSnapshot} />
  );
}
