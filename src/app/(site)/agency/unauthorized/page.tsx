import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agencyDashboardPath } from "@/lib/agency/sections";
import { getProfile, getSessionUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Agency access required",
};

export default async function AgencyUnauthorizedPage() {
  const user = await getSessionUser();
  const profile = user ? await getProfile() : null;

  if (profile?.role === "agency") {
    redirect(agencyDashboardPath());
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-primary" />
            Agency access required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            {user
              ? "Your account does not have agency permissions. Agency owners, admins, and team members can access the portal."
              : "Sign in with an agency account to access the dashboard, roster, bookings, and revenue tools."}
          </p>
          <div className="flex flex-wrap gap-2">
            {user ? (
              <Button size="sm" href={ROUTES.discover}>
                Go to Discover
              </Button>
            ) : (
              <Button size="sm" href={`/login?redirect=${encodeURIComponent(agencyDashboardPath())}`}>
                Sign in
              </Button>
            )}
            <Button size="sm" variant="secondary" href={ROUTES.agencyHome}>
              Learn about agencies
            </Button>
          </div>
          <p className="text-xs">
            Need an agency account?{" "}
            <Link href={ROUTES.agencyHome} className="text-primary hover:underline">
              Create or join an agency
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
