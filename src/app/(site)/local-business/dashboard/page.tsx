import type { Metadata } from "next";
import Link from "next/link";
import { LocalBusinessDashboard } from "@/components/local-business/local-business-dashboard";
import { requireUserProfile } from "@/lib/auth/guards";
import { getLocalBusinessDashboard } from "@/lib/data/local-business";

export const metadata: Metadata = { title: "Local business dashboard" };

export default async function LocalBusinessDashboardPage() {
  const { user } = await requireUserProfile();
  const report = await getLocalBusinessDashboard(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Business dashboard</h1>
        <Link href="/local-business" className="text-sm text-primary hover:underline">
          ← Marketplace
        </Link>
      </div>
      <LocalBusinessDashboard report={report} />
    </div>
  );
}
