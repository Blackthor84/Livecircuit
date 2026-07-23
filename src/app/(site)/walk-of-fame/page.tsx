import type { Metadata } from "next";
import { WalkOfFameHubDisplay } from "@/components/walk-of-fame/walk-of-fame-hub-display";
import { getWalkOfFameHubReport } from "@/lib/data/walk-of-fame";

export const metadata: Metadata = {
  title: "Digital Walk of Fame",
  description: "Permanent stars for LiveCircuit artists who move the culture.",
};

export default async function WalkOfFamePage() {
  const report = await getWalkOfFameHubReport();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <WalkOfFameHubDisplay report={report} />
    </div>
  );
}
