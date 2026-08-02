import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminFeatureFlagsPanel } from "@/components/admin/platform/admin-feature-flags-panel";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";

export const metadata: Metadata = { title: "Feature Flags — Admin" };

export default async function AdminFeatureFlagsPage() {
  const snapshot = await getMonetizationSnapshot();

  return (
    <>
      <AdminPageHeader
        title="Feature Flags"
        subtitle="Control platform features with enable/disable, beta rollout, regional targeting, and scheduled activation — no code changes required."
      />
      <AdminFeatureFlagsPanel flags={snapshot.featureFlags} />
    </>
  );
}
