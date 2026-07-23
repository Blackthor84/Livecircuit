import type { Metadata } from "next";
import { FestivalsHub } from "@/components/festivals/festivals-hub";
import { getFestivalsHubReport } from "@/lib/data/virtual-festivals";

export const metadata: Metadata = {
  title: "Virtual Festivals · LiveCircuit",
  description: "Multi-day festivals, passes, schedules, maps, and leaderboards.",
};

export default async function FestivalsPage() {
  const report = await getFestivalsHubReport();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Virtual Festivals</h1>
      <p className="mt-2 text-muted-foreground">
        Multi-venue, multi-day experiences with passes, VIP upgrades, schedules, and collectibles.
      </p>
      <div className="mt-10">
        <FestivalsHub report={report} />
      </div>
    </div>
  );
}
