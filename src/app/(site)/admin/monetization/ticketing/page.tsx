import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminTicketingPanel } from "@/components/admin/monetization/admin-monetization-panels";
import { getMonetizationAdminSnapshot } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Ticketing — Admin" };

export default async function AdminTicketingPage() {
  const snapshot = await getMonetizationAdminSnapshot();
  return (
    <>
      <AdminPageHeader title="Ticketing" subtitle="Platform ticket fees, VIP/replay fees, refunds, chargebacks, and Stripe Connect settings." />
      <AdminTicketingPanel config={snapshot.tickets} />
    </>
  );
}
