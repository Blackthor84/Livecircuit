import type { Metadata } from "next";
import { LiveCircuitWorldExperience } from "@/components/world/livecircuit-world-experience";
import { getWorldReport } from "@/lib/data/world";

export const metadata: Metadata = {
  title: "LiveCircuit World",
  description: "Interactive globe — zoom from Earth to venues, concourses, and live events.",
};

export default async function WorldPage() {
  const report = await getWorldReport();

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <LiveCircuitWorldExperience report={report} />
    </div>
  );
}
