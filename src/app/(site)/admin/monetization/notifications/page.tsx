import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminNotificationsPanel } from "@/components/admin/monetization/admin-notifications-panel";
import { MonetizationAdminShell } from "@/components/admin/monetization/monetization-admin-shell";
import {
  getNotificationStats,
  listAdminNotifications,
} from "@/lib/monetization/admin-notifications.service";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin Notifications — Monetization" };

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const [notifications, stats] = await Promise.all([
    listAdminNotifications(supabase, { limit: 100 }),
    getNotificationStats(supabase),
  ]);

  return (
    <MonetizationAdminShell>
      <AdminPageHeader
        title="Admin Notifications"
        subtitle="Pricing changes, webhook failures, payment alerts, coupon expirations, and platform events."
      />
      <AdminNotificationsPanel notifications={notifications} stats={stats} />
    </MonetizationAdminShell>
  );
}
