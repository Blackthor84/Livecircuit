import type { Metadata } from "next";
import { CoinsHubDashboard } from "@/components/fan/coins-hub-dashboard";
import { requireUserProfile } from "@/lib/auth/guards";
import { getCoinsHubReport } from "@/lib/data/coins";

export const metadata: Metadata = { title: "LiveCircuit Coins" };

export default async function CoinsPage() {
  const { user } = await requireUserProfile();
  const report = await getCoinsHubReport(user.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="sr-only">LiveCircuit Coins</h1>
      <CoinsHubDashboard report={report} />
    </div>
  );
}
