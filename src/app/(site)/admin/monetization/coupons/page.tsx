import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminCouponsPanel } from "@/components/admin/monetization/admin-monetization-panels";
import { listMonetizationCoupons } from "@/lib/data/monetization-admin";

export const metadata: Metadata = { title: "Coupons — Admin" };

export default async function AdminCouponsPage() {
  const coupons = await listMonetizationCoupons();
  return (
    <>
      <AdminPageHeader title="Coupons & Discounts" subtitle="Venue, agency, festival, referral, and seasonal discount codes." />
      <AdminCouponsPanel coupons={coupons} />
    </>
  );
}
