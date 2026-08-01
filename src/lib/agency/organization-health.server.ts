import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAgencyPermissions } from "@/lib/agency/permissions";
import {
  ensureAgencyMembership,
  ensureAgencySubscription,
  listAgencyMembershipsForUserAdmin,
} from "@/lib/agency/membership.server";
import type { OrganizationHealthCheck } from "@/lib/agency/membership.types";
import type { AgencyMemberRole } from "@/lib/agency/types";
import { getAgencyOrgTemplate, type AgencyScenarioSlug } from "@/lib/agency/org-templates";
import { seedAgencyScenario } from "@/lib/testing/scenarios/agency.server";
import { createTestCreationLog, logTestStep } from "@/lib/testing/step-errors";

export type { OrganizationHealthCheck } from "@/lib/agency/membership.types";

function logHealth(step: string, data?: Record<string, unknown>) {
  console.info(`[Agency Organization] ${step}`, data ?? {});
}

export async function ensureAgencyDashboardSettings(
  admin: SupabaseClient,
  organizationId: string,
  scenario: AgencyScenarioSlug
) {
  const { data: org } = await admin
    .from("agency_organizations")
    .select("metadata")
    .eq("id", organizationId)
    .maybeSingle();

  const metadata = ((org?.metadata ?? {}) as Record<string, unknown>) ?? {};
  const dashboardSettings = metadata.dashboard_settings as Record<string, unknown> | undefined;
  const orgSettings = metadata.settings as Record<string, unknown> | undefined;

  if (dashboardSettings && orgSettings) return;

  logHealth("Patching agency dashboard settings", { organizationId, scenario });

  await admin
    .from("agency_organizations")
    .update({
      metadata: {
        ...metadata,
        test: metadata.test ?? true,
        scenario,
        dashboard_settings: dashboardSettings ?? {
          widgets: ["overview", "bookings", "revenue", "roster", "calendar", "messages"],
          layout: "default",
        },
        settings: orgSettings ?? {
          timezone: "America/New_York",
          notifications_enabled: true,
          booking_auto_match: true,
        },
      },
    })
    .eq("id", organizationId);
}

async function countRows(
  admin: SupabaseClient,
  table: string,
  filter: { column: string; value: string }
): Promise<number> {
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(filter.column, filter.value);

  if (error) {
    logHealth("Count query failed", { table, error: error.message });
    return 0;
  }
  return count ?? 0;
}

export async function validateAgencyOrganizationHealth(
  admin: SupabaseClient,
  input: { userId: string; organizationId: string }
): Promise<{ ok: boolean; checks: OrganizationHealthCheck[] }> {
  const { userId, organizationId } = input;
  const checks: OrganizationHealthCheck[] = [];

  logHealth("Validating organization health", { userId, organizationId });

  const { data: org, error: orgError } = await admin
    .from("agency_organizations")
    .select("id, plan, stripe_subscription_id, metadata")
    .eq("id", organizationId)
    .maybeSingle();

  checks.push({
    key: "agency",
    ok: Boolean(org && !orgError),
    issue: orgError?.message ?? (org ? undefined : "Agency organization record missing"),
    table: "agency_organizations",
  });

  const memberships = await listAgencyMembershipsForUserAdmin(admin, userId);
  const membership = memberships.find((m) => m.organization_id === organizationId) ?? memberships[0];
  checks.push({
    key: "membership",
    ok: Boolean(membership),
    issue: membership ? undefined : "agency_organization_members row missing for user",
    table: "agency_organization_members",
  });

  if (membership) {
    const permissions = getAgencyPermissions(membership.role);
    checks.push({
      key: "permissions",
      ok: Object.keys(permissions).length > 0,
      issue: Object.keys(permissions).length ? undefined : "Role permissions could not be resolved",
    });
  } else {
    checks.push({ key: "permissions", ok: false, issue: "Cannot resolve permissions without membership" });
  }

  checks.push({
    key: "subscription",
    ok: Boolean(org?.plan && org?.stripe_subscription_id),
    issue:
      org?.plan && org?.stripe_subscription_id
        ? undefined
        : "Agency subscription plan or stripe_subscription_id missing",
    table: "agency_organizations",
  });

  const metadata = (org?.metadata ?? {}) as Record<string, unknown>;
  checks.push({
    key: "dashboard_settings",
    ok: Boolean(metadata.dashboard_settings && metadata.settings),
    issue:
      metadata.dashboard_settings && metadata.settings
        ? undefined
        : "Agency dashboard settings missing in organization metadata",
    table: "agency_organizations",
  });

  const rosterCount = await countRows(admin, "agency_managed_artists", {
    column: "organization_id",
    value: organizationId,
  });
  checks.push({
    key: "roster",
    ok: rosterCount > 0,
    issue: rosterCount > 0 ? undefined : "Managed artist roster is empty",
    table: "agency_managed_artists",
  });

  const bookingCount = await countRows(admin, "agency_booking_requests", {
    column: "organization_id",
    value: organizationId,
  });
  checks.push({
    key: "bookings",
    ok: bookingCount > 0,
    issue: bookingCount > 0 ? undefined : "No booking requests seeded",
    table: "agency_booking_requests",
  });

  const calendarCount = await countRows(admin, "agency_calendar_events", {
    column: "organization_id",
    value: organizationId,
  });
  checks.push({
    key: "calendar",
    ok: calendarCount > 0,
    issue: calendarCount > 0 ? undefined : "No calendar events seeded",
    table: "agency_calendar_events",
  });

  const sponsorCount = await countRows(admin, "agency_sponsorship_proposals", {
    column: "organization_id",
    value: organizationId,
  });
  checks.push({
    key: "sponsors",
    ok: sponsorCount > 0,
    issue: sponsorCount > 0 ? undefined : "No sponsorship proposals seeded",
    table: "agency_sponsorship_proposals",
  });

  const { count: messageCount } = await admin
    .from("agency_conversations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  checks.push({
    key: "messages",
    ok: (messageCount ?? 0) > 0,
    issue: (messageCount ?? 0) > 0 ? undefined : "No agency conversations seeded",
    table: "agency_conversations",
  });

  const { count: notificationCount } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  checks.push({
    key: "notifications",
    ok: (notificationCount ?? 0) > 0,
    issue: (notificationCount ?? 0) > 0 ? undefined : "No notifications seeded for user",
    table: "notifications",
  });

  const ok = checks.every((c) => c.ok);
  logHealth("Organization health result", {
    userId,
    organizationId,
    ok,
    failed: checks.filter((c) => !c.ok).map((c) => c.key),
  });

  return { ok, checks };
}

export async function ensureAgencyOrganizationComplete(
  admin: SupabaseClient,
  input: {
    userId: string;
    organizationId: string;
    memberRole: AgencyMemberRole;
    scenario: AgencyScenarioSlug;
  }
): Promise<{ ok: true; repaired: string[] } | { ok: false; error: string }> {
  const log = createTestCreationLog();
  const template = getAgencyOrgTemplate(input.scenario);
  const repaired: string[] = [];

  logTestStep(log, `Ensuring organization complete (${template.label})...`);

  const { data: org } = await admin
    .from("agency_organizations")
    .select("id")
    .eq("id", input.organizationId)
    .maybeSingle();

  if (!org) {
    return { ok: false, error: "Agency organization not found." };
  }

  await ensureAgencyMembership(admin, {
    userId: input.userId,
    organizationId: input.organizationId,
    role: input.memberRole,
  });
  repaired.push("membership");

  await ensureAgencySubscription(admin, input.organizationId, template.plan);
  repaired.push("subscription");

  await ensureAgencyDashboardSettings(admin, input.organizationId, input.scenario);
  repaired.push("dashboard_settings");

  const health = await validateAgencyOrganizationHealth(admin, {
    userId: input.userId,
    organizationId: input.organizationId,
  });

  const needsSeed = health.checks.some(
    (c) => !c.ok && ["roster", "bookings", "calendar", "sponsors", "messages", "notifications"].includes(c.key)
  );

  if (needsSeed) {
    logTestStep(log, "Seeding missing organization data...");
    await seedAgencyScenario(admin, log, input.organizationId, input.userId, input.scenario, Date.now() % 100000);
    repaired.push("seed_data");
  }

  const finalHealth = await validateAgencyOrganizationHealth(admin, {
    userId: input.userId,
    organizationId: input.organizationId,
  });

  if (!finalHealth.ok) {
    const issues = finalHealth.checks.filter((c) => !c.ok).map((c) => c.issue ?? c.key);
    return { ok: false, error: issues.join("; ") };
  }

  return { ok: true, repaired };
}
