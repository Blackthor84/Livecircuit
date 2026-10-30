import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminCommissionPanel, AdminTicketingPanel } from "@/components/admin/monetization/admin-monetization-panels";
import { getMonetizationAdminSnapshot } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Ticketing — Admin" };

export default async function AdminTicketingPage() {
  const snapshot = await getMonetizationAdminSnapshot();
  return (
    <>
      <AdminPageHeader title="Ticketing" subtitle="Artist commission rates, ticket fee settings, refunds, chargebacks, and Stripe Connect." />
      <div className="space-y-6">
        <AdminCommissionPanel config={snapshot.commissions} />
        <AdminTicketingPanel config={snapshot.tickets} />
      </div>
    </>
  );
}
