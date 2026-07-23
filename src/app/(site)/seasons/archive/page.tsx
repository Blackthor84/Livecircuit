import type { Metadata } from "next";
import Link from "next/link";
import { SeasonsHub } from "@/components/seasons/seasons-hub";
import { getSeasonsHubReport } from "@/lib/data/seasons";

export const metadata: Metadata = {
  title: "Season archive · LiveCircuit",
  description: "Historical LiveCircuit seasons and statistics.",
};

export default async function SeasonsArchivePage() {
  const report = await getSeasonsHubReport();
  const archiveOnly = { ...report, active: [], upcoming: [] };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/seasons" className="text-sm text-muted-foreground hover:text-foreground">
        ← Seasons hub
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Season archive</h1>
      <p className="mt-2 text-muted-foreground">Past seasons, final rewards, and historical stats.</p>
      <div className="mt-10">
        <SeasonsHub report={archiveOnly} />
      </div>
    </div>
  );
}
