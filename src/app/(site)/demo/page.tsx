import type { Metadata } from "next";
import { DemoGateway } from "@/components/demo/demo-gateway";

export const metadata: Metadata = {
  title: "Interactive Demo",
  description:
    "Experience the future of live entertainment — take an interactive tour of LiveCircuit as an artist, fan, or talent agency.",
};

export default function DemoPage() {
  return <DemoGateway />;
}
