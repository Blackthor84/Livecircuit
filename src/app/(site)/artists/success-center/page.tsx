import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { ArtistSuccessCenter } from "@/components/artists/success-center/artist-success-center";

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

export default function ArtistSuccessCenterPage() {
  return <ArtistSuccessCenter />;
}
