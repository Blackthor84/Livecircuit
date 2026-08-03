import type { Metadata } from "next";
import { InteractiveDemoLayout } from "@/components/demo/interactive/interactive-demo-layout";

export const metadata: Metadata = {
  title: { absolute: "Interactive Demo | LiveCircuit" },
  description: "Experience the future of live entertainment — artist, fan, agency, and sponsor demos.",
};

export default function InteractiveDemoLayoutPage({ children }: { children: React.ReactNode }) {
  return <InteractiveDemoLayout>{children}</InteractiveDemoLayout>;
}
