import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FanPassportDashboard } from "@/components/fan/fan-passport-dashboard";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getFanPassportReport } from "@/lib/data/fan-passport";

export const metadata: Metadata = {
  title: "Fan Passport · LiveCircuit",
  description: "Your digital passport of venues, cities, and live moments.",
};

export default async function FanPassportPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/passport");

  const report = await getFanPassportReport(user.id);
  if (!report) redirect("/register");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
        ← Your dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">Fan Passport</h1>
        <Button variant="outline" href="/discover">
          Find your next show
        </Button>
      </div>
      <div className="mt-8">
        <FanPassportDashboard report={report} />
      </div>
    </div>
  );
}
