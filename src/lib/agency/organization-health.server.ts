import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAgencyPermissions } from "@/lib/agency/permissions";
import {
  ensureAgencyMembership,
  ensureAgencySubscription,
  listAgencyMembershipsForUserAdmin,
} from "@/lib/agency/server";
import type { OrganizationHealthCheck } from "@/lib/agency/membership.types";
import type { AgencyDashboardConfiguration, AgencyMemberRole } from "@/lib/agency/types";
import { getAgencyOrgTemplate, type AgencyScenarioSlug } from "@/lib/agency";
import { seedAgencyScenario } from "@/lib/testing/scenarios/agency.server";
import { createAgencyTestUser } from "@/lib/testing/create-agency-user";
import type { AgencyGenerationMode } from "@/lib/testing/constants";
import { createTestCreationLog, logTestStep } from "@/lib/testing/step-errors";
import { AGENCY_DASHBOARD_PATH } from "@/lib/agency/sections";

export type { OrganizationHealthCheck } from "@/lib/agency/membership.types";
export type { AgencyDashboardConfiguration } from "@/lib/agency/types";

function logHealth(step: string, data?: Record<string, unknown>) {
  console.info(`[Agency Organization] ${step}`, data ?? {});
}

export function buildDefaultAgencyDashboardConfiguration(
  scenario: AgencyScenarioSlug
): AgencyDashboardConfiguration {
  const template = getAgencyOrgTemplate(scenario);
  const basePath = AGENCY_DASHBOARD_PATH.replace(/\/dashboard$/, "");

  return {
    dashboard_settings: {
      widgets: ["overview", "bookings", "revenue", "roster", "calendar", "messages", "analytics"],
      layout: "default",
      navigation: [
        { id: "dashboard", label: "Dashboard", href: `${basePath}/dashboard` },
        { id: "artists", label: "Artists", href: `${basePath}/artists` },
        { id: "book-roster", label: "Bookings", href: `${basePath}/book-roster` },
        { id: "revenue", label: "Revenue", href: `${basePath}/revenue` },
        { id: "analytics", label: "Analytics", href: `${basePath}/analytics` },
        { id: "calendar", label: "Calendar", href: `${basePath}/calendar` },
        { id: "team", label: "Team", href: `${basePath}/team` },
        { id: "communications", label: "Messages", href: `${basePath}/communications` },
        { id: "sponsorship", label: "Sponsors", href: `${basePath}/sponsorship` },
      ],
      preferences: {
        compact_mode: false,
        default_date_range: "30d",
        show_revenue: true,
      },
    },
    settings: {
      timezone: "America/New_York",
      notifications_enabled: true,
      booking_auto_match: true,
    },
    analytics: {
      enabled: true,
      default_range: template.plan === "enterprise" ? "90d" : template.plan === "pro" ? "60d" : "30d",
      modules:
        template.plan === "enterprise"
          ? ["revenue", "bookings", "roster", "geo", "sponsors", "team"]
          : template.plan === "pro"
            ? ["revenue", "bookings", "roster", "sponsors"]
            : ["revenue", "bookings", "roster"],
    },
    feature_flags: {
      bulk_booking: true,
      sponsorship: template.plan !== "starter",
      team_management: true,
      advanced_analytics: template.plan !== "starter",
      calendar_sync: true,
    },
  };
}

function mergeDashboardConfiguration(
  existing: Record<string, unknown>,
  scenario: AgencyScenarioSlug
): AgencyDashboardConfiguration {
  const defaults = buildDefaultAgencyDashboardConfiguration(scenario);
  const dashboardSettings =
    (existing.dashboard_settings as Partial<AgencyDashboardConfiguration["dashboard_settings"]> | undefined) ?? {};
  const settings = (existing.settings as Partial<AgencyDashboardConfiguration["settings"]> | undefined) ?? {};
  const analytics = (existing.analytics as Partial<AgencyDashboardConfiguration["analytics"]> | undefined) ?? {};
  const featureFlags = (existing.feature_flags as Partial<AgencyDashboardConfiguration["feature_flags"]> | undefined) ?? {};

  return {
    dashboard_settings: {
      widgets: dashboardSettings.widgets?.length ? dashboardSettings.widgets : defaults.dashboard_settings.widgets,
      layout: dashboardSettings.layout ?? defaults.dashboard_settings.layout,
      navigation: dashboardSettings.navigation?.length
        ? dashboardSettings.navigation
        : defaults.dashboard_settings.navigation,
      preferences: {
        ...defaults.dashboard_settings.preferences,
        ...dashboardSettings.preferences,
      },
    },
    settings: {
      ...defaults.settings,
      ...settings,
    },
    analytics: {
      ...defaults.analytics,
      ...analytics,
      modules: analytics.modules?.length ? analytics.modules : defaults.analytics.modules,
    },
    feature_flags: {
      ...defaults.feature_flags,
      ...featureFlags,
    },
  };
}

export async function ensureAgencyDashboardSettings(
  admin: SupabaseClient,
  organizationId: string,
  scenario: AgencyScenarioSlug
): Promise<AgencyDashboardConfiguration> {
  const { data: org } = await admin
    .from("agency_organizations")
    .select("metadata")
    .eq("id", organizationId)
    .maybeSingle();

  const metadata = ((org?.metadata ?? {}) as Record<string, unknown>) ?? {};
  const configuration = mergeDashboardConfiguration(metadata, scenario);

  const needsPatch =
    !metadata.dashboard_settings ||
    !metadata.settings ||
    !metadata.analytics ||
    !metadata.feature_flags ||
    JSON.stringify(metadata.dashboard_settings) !== JSON.stringify(configuration.dashboard_settings) ||
    JSON.stringify(metadata.settings) !== JSON.stringify(configuration.settings) ||
    JSON.stringify(metadata.analytics) !== JSON.stringify(configuration.analytics) ||
    JSON.stringify(metadata.feature_flags) !== JSON.stringify(configuration.feature_flags);

  if (needsPatch) {
    logHealth("Patching agency dashboard settings", { organizationId, scenario });
    await admin
      .from("agency_organizations")
      .update({
        metadata: {
          ...metadata,
          test: metadata.test ?? true,
          scenario,
          dashboard_settings: configuration.dashboard_settings,
          settings: configuration.settings,
          analytics: configuration.analytics,
          feature_flags: configuration.feature_flags,
        },
      })
      .eq("id", organizationId);
  }

  return configuration;
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
  const scenarioSlug = (metadata.scenario as AgencyScenarioSlug | undefined) ?? "boutique_agency";
  const orgTemplate = getAgencyOrgTemplate(scenarioSlug);
  checks.push({
    key: "dashboard_settings",
    ok: Boolean(metadata.dashboard_settings && metadata.settings && metadata.analytics && metadata.feature_flags),
    issue:
      metadata.dashboard_settings && metadata.settings && metadata.analytics && metadata.feature_flags
        ? undefined
        : "Agency dashboard settings, preferences, analytics, or feature flags missing in organization metadata",
    table: "agency_organizations",
  });

  const expectedTeamSize =
    1 + orgTemplate.team.reduce((sum, slot) => sum + slot.count, 0);

  const teamCount = await countRows(admin, "agency_organization_members", {
    column: "organization_id",
    value: organizationId,
  });
  checks.push({
    key: "team",
    ok: teamCount >= expectedTeamSize,
    issue:
      teamCount >= expectedTeamSize
        ? undefined
        : `Agency team incomplete (${teamCount}/${expectedTeamSize} members)`,
    table: "agency_organization_members",
  });

  const rosterCount = await countRows(admin, "agency_managed_artists", {
    column: "organization_id",
    value: organizationId,
  });
  checks.push({
    key: "roster",
    ok: rosterCount >= orgTemplate.artistCount,
    issue:
      rosterCount >= orgTemplate.artistCount
        ? undefined
        : `Managed artist roster incomplete (${rosterCount}/${orgTemplate.artistCount})`,
    table: "agency_managed_artists",
  });

  const bookingCount = await countRows(admin, "agency_booking_requests", {
    column: "organization_id",
    value: organizationId,
  });
  const minBookings = Math.min(orgTemplate.bookingCount, 10);
  checks.push({
    key: "bookings",
    ok: bookingCount >= minBookings,
    issue:
      bookingCount >= minBookings
        ? undefined
        : `Booking requests incomplete (${bookingCount}/${minBookings} minimum)`,
    table: "agency_booking_requests",
  });

  const calendarCount = await countRows(admin, "agency_calendar_events", {
    column: "organization_id",
    value: organizationId,
  });
  const minCalendar = Math.min(12, orgTemplate.artistCount);
  checks.push({
    key: "calendar",
    ok: calendarCount >= minCalendar,
    issue:
      calendarCount >= minCalendar
        ? undefined
        : `Calendar events incomplete (${calendarCount}/${minCalendar} minimum)`,
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

  checks.push({
    key: "analytics",
    ok: Boolean(metadata.analytics_snapshot),
    issue: metadata.analytics_snapshot ? undefined : "Analytics snapshot missing from organization metadata",
    table: "agency_organizations",
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

async function ensureMissingAgencyTeam(
  admin: SupabaseClient,
  log: ReturnType<typeof createTestCreationLog>,
  input: {
    organizationId: string;
    scenario: AgencyScenarioSlug;
    createdBy: string;
    seed: number;
  }
): Promise<{ userId: string; role: AgencyMemberRole }[]> {
  const template = getAgencyOrgTemplate(input.scenario);
  const { data: org } = await admin
    .from("agency_organizations")
    .select("name")
    .eq("id", input.organizationId)
    .maybeSingle();

  const { data: members } = await admin
    .from("agency_organization_members")
    .select("role")
    .eq("organization_id", input.organizationId);

  const roleCounts = new Map<AgencyMemberRole, number>();
  for (const member of members ?? []) {
    const role = member.role as AgencyMemberRole;
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }

  const created: { userId: string; role: AgencyMemberRole }[] = [];
  let slotIndex = 0;

  for (const { role, count } of template.team) {
    let current = roleCounts.get(role) ?? 0;
    while (current < count) {
      logTestStep(log, `Creating missing team member (${role} ${current + 1}/${count})...`);
      const member = await createAgencyTestUser(admin, log, {
        organizationId: input.organizationId,
        memberRole: role,
        scenario: `${input.scenario}_${role}_${current}`,
        createdBy: input.createdBy,
        seed: input.seed + slotIndex + 2000,
        orgName: (org?.name as string) ?? template.label,
        generationMode: "repair",
        roleSlot: current,
      });
      current += 1;
      slotIndex += 1;
      roleCounts.set(role, current);
      created.push({ userId: member.userId, role });
    }
  }

  return created;
}

async function loadAgencyTeamMembers(
  admin: SupabaseClient,
  organizationId: string
): Promise<{ userId: string; role: AgencyMemberRole }[]> {
  const { data } = await admin
    .from("agency_organization_members")
    .select("user_id, role")
    .eq("organization_id", organizationId);

  return (data ?? []).map((row) => ({
    userId: row.user_id as string,
    role: row.role as AgencyMemberRole,
  }));
}

export async function ensureAgencyOrganizationComplete(
  admin: SupabaseClient,
  input: {
    userId: string;
    organizationId: string;
    memberRole: AgencyMemberRole;
    scenario: AgencyScenarioSlug;
    createdBy?: string;
    generationMode?: AgencyGenerationMode;
  }
): Promise<{ ok: true; repaired: string[] } | { ok: false; error: string }> {
  const log = createTestCreationLog();
  const template = getAgencyOrgTemplate(input.scenario);
  const repaired: string[] = [];
  const createdBy = input.createdBy ?? input.userId;
  const generationMode = input.generationMode ?? "repair";
  const seed = Date.now() % 100000;

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

  let teamMembers = await loadAgencyTeamMembers(admin, input.organizationId);
  logTestStep(log, "Ensuring complete agency team...");
  const createdTeam = await ensureMissingAgencyTeam(admin, log, {
    organizationId: input.organizationId,
    scenario: input.scenario,
    createdBy,
    seed,
  });
  if (createdTeam.length) {
    repaired.push("team");
    teamMembers = await loadAgencyTeamMembers(admin, input.organizationId);
  }

  const health = await validateAgencyOrganizationHealth(admin, {
    userId: input.userId,
    organizationId: input.organizationId,
  });

  const needsSeed = health.checks.some(
    (c) =>
      !c.ok &&
      ["roster", "bookings", "calendar", "sponsors", "messages", "notifications", "analytics"].includes(c.key)
  );

  if (needsSeed) {
    logTestStep(log, "Seeding missing organization data...");
    await seedAgencyScenario(admin, log, input.organizationId, input.userId, input.scenario, seed, {
      createdBy,
      fillMissingOnly: true,
      teamUserIds: teamMembers.filter((m) => m.userId !== input.userId),
      generationMode,
    });
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
