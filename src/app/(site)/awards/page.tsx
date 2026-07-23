import type { Metadata } from "next";
import Link from "next/link";
import { AwardsHub } from "@/components/awards/awards-hub";
import { getAwardsHubReport } from "@/lib/data/awards";

export const metadata: Metadata = {
  title: "LiveCircuit Awards",
  description: "Annual honors, fan voting, live ceremony, and historical archive.",
};

export default async function AwardsPage() {
  const report = await getAwardsHubReport();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold">LiveCircuit Awards</h1>
        <p className="mt-2 text-muted-foreground">
          Nominees, fan voting, countdown to the live show, and past winners.
        </p>
      </div>
      <div className="mt-10">
        <AwardsHub report={report} />
      </div>
      <p className="mt-10 text-sm text-muted-foreground">
        <Link href="/walk-of-fame" className="text-primary hover:underline">
          Digital Walk of Fame
        </Link>
      </p>
    </div>
  );
}
