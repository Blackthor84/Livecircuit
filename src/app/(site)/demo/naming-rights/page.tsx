import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { SponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer";

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

export default function SponsorVisualizerPage() {
  return <SponsorVisualizer />;
}
