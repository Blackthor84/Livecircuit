import type { Metadata } from "next";
import { NamingRightsDemo } from "@/components/demo/naming-rights/naming-rights-demo";

export const metadata: Metadata = {
  title: "Naming Rights Visualizer | LiveCircuit Sponsorship",
  description:
    "Type your company name and instantly visualize your branded LiveCircuit arena — naming rights, billboards, tickets, analytics, and ROI.",
  openGraph: {
    title: "See Your Brand Power the Future of Live Entertainment",
    description:
      "Interactive sponsorship visualizer for enterprise partners considering LiveCircuit arena naming rights.",
  },
};

export default function NamingRightsDemoPage() {
  return <NamingRightsDemo />;
}
