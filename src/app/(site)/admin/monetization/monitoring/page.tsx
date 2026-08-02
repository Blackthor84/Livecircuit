import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminMonitoringPanel } from "@/components/admin/monetization/admin-monitoring-panel";
import { MonetizationAdminShell } from "@/components/admin/monetization/monetization-admin-shell";
import { detectRuleConflicts } from "@/lib/business-rules/engine";
import { getBusinessRulesSnapshot } from "@/lib/business-rules/rules-resolver.server";
import { getNotificationStats } from "@/lib/monetization/admin-notifications.service";
import { validatePricingSnapshot } from "@/lib/monetization/validation.server";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Monetization Monitoring — Admin" };

export default async function AdminMonitoringPage() {
  const admin = getSupabaseAdmin();
  const [snapshot, rulesSnapshot, notifStats] = await Promise.all([
    getMonetizationSnapshot(),
    getBusinessRulesSnapshot(),
    getNotificationStats(admin),
  ]);

  const validationIssues = validatePricingSnapshot(snapshot, rulesSnapshot.rules);
  const pricingErrors = validationIssues.filter((i) => i.severity === "error").length;
  const ruleConflicts = detectRuleConflicts(rulesSnapshot.rules).length;

  const [{ count: webhookFailures }, { count: failedPayments }] = await Promise.all([
    admin
      .from("monetization_stripe_webhook_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    admin
      .from("monetization_payment_records")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
  ]);

  const { count: couponFailures } = await admin
    .from("monetization_admin_notifications")
    .select("id", { count: "exact", head: true })
    .eq("category", "coupon_expiration")
    .eq("is_read", false);

  return (
    <MonetizationAdminShell>
      <AdminPageHeader
        title="Monetization Monitoring"
        subtitle="Webhook health, pricing validation, rule conflicts, and financial alert overview."
      />
      <AdminMonitoringPanel
        stats={{
          webhookFailures: webhookFailures ?? 0,
          pricingErrors,
          failedPayments: failedPayments ?? 0,
          couponFailures: couponFailures ?? 0,
          unreadNotifications: notifStats.unread,
          ruleConflicts,
        }}
      />
    </MonetizationAdminShell>
  );
}
