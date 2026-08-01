import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureAgencyOrganizationComplete } from "@/lib/agency/organization-health.server";
import {
  AGENCY_SCENARIOS,
  expandAgencyTeamTemplate,
  getAgencyOrgTemplate,
  type AgencyScenarioSlug,
} from "@/lib/agency/org-templates";
import { ensureAgencySubscription, verifyAgencyMembershipAdmin } from "@/lib/agency/membership.server";
import type { AgencyMemberRole } from "@/lib/agency/types";
import { createAgencyTestUser } from "@/lib/testing/create-agency-user";
import { seedAgencyScenario } from "@/lib/testing/scenarios/agency.server";
import {
  createTestCreationLog,
  logTestStep,
  throwDbError,
  throwParsedError,
  type TestCreationLog,
} from "@/lib/testing/step-errors";

export type CreatedTestAgency = {
  orgId: string;
  orgName: string;
  ownerUserId: string;
  ownerEmail: string;
  scenario: AgencyScenarioSlug;
  teamUserIds: { userId: string; role: AgencyMemberRole; email: string }[];
  steps: string[];
};

async function createAgencyOrganization(
  admin: ReturnType<typeof getSupabaseAdmin>,
  log: TestCreationLog,
  scenario: AgencyScenarioSlug,
  seed: number
) {
  const template = getAgencyOrgTemplate(scenario);
  const slug = `test-agency-${seed}`;
  const orgName = `${template.label} — LiveCircuit QA`;

  logTestStep(log, "Step 1: Creating test agency organization...");
  const { data: org, error: orgError } = await admin
    .from("agency_organizations")
    .insert({
      slug,
      name: orgName,
      biography: `Production-quality ${template.label.toLowerCase()} organization for LiveCircuit agency QA.`,
      plan: template.plan,
      verified: scenario !== "boutique_agency",
      is_test: true,
      genres: ["music", "comedy", "podcast", "speakers", "sports"],
      years_in_business: 5 + (seed % 20),
      plan_started_at: new Date(Date.now() - 90 * 86400000).toISOString(),
      plan_renews_at: new Date(Date.now() + 275 * 86400000).toISOString(),
      stripe_subscription_id: `test_sub_agency_${seed}`,
      metadata: {
        test: true,
        scenario,
        accountType: "AGENCY",
        organization_type: "agency",
        dashboard_settings: {
          widgets: ["overview", "bookings", "revenue", "roster", "calendar", "messages"],
          layout: "default",
        },
        settings: {
          timezone: "America/New_York",
          notifications_enabled: true,
          booking_auto_match: true,
        },
      },
    })
    .select("id, name")
    .single();

  if (orgError || !org) throwDbError(log, "Step 1: Create agency org", orgError ?? new Error("No org"));

  await ensureAgencySubscription(admin, org.id as string, template.plan);
  return { org, template };
}

async function seedAgencyTeamFromTemplate(
  admin: ReturnType<typeof getSupabaseAdmin>,
  log: TestCreationLog,
  input: {
    organizationId: string;
    orgName: string;
    scenario: AgencyScenarioSlug;
    createdBy: string;
    seed: number;
    seedTeamMembers: boolean;
  }
) {
  const template = getAgencyOrgTemplate(input.scenario);
  const teamUserIds: CreatedTestAgency["teamUserIds"] = [];

  if (!input.seedTeamMembers) {
    logTestStep(log, "Step 3: Skipped team accounts (full template disabled)");
    return teamUserIds;
  }

  logTestStep(log, `Step 3: Creating agency team from ${template.label} template...`);
  const slots = expandAgencyTeamTemplate(template);

  for (let i = 0; i < slots.length; i++) {
    const { role, slot } = slots[i]!;
    const member = await createAgencyTestUser(admin, log, {
      organizationId: input.organizationId,
      memberRole: role,
      scenario: `${input.scenario}_${role}_${slot}`,
      createdBy: input.createdBy,
      seed: input.seed + i + 1000,
      orgName: input.orgName,
    });
    teamUserIds.push({ userId: member.userId, role, email: member.email });
  }

  logTestStep(log, `Step 3 complete: ${teamUserIds.length} team members created`);
  return teamUserIds;
}

export async function createTestAgency(input: {
  scenario: AgencyScenarioSlug;
  createdBy: string;
  artistCount?: number;
  seedTeamMembers?: boolean;
  seed?: number;
}): Promise<CreatedTestAgency> {
  const log = createTestCreationLog();
  const admin = getSupabaseAdmin();
  const seed = input.seed ?? Date.now() % 100000;
  const seedTeamMembers = input.seedTeamMembers ?? true;
  const template = getAgencyOrgTemplate(input.scenario);

  const { org } = await createAgencyOrganization(admin, log, input.scenario, seed);

  logTestStep(log, "Step 2: Creating agency owner account (accountType=AGENCY)...");
  const owner = await createAgencyTestUser(admin, log, {
    organizationId: org.id as string,
    memberRole: "owner",
    scenario: input.scenario,
    createdBy: input.createdBy,
    seed,
    orgName: org.name as string,
  });

  const teamUserIds = await seedAgencyTeamFromTemplate(admin, log, {
    organizationId: org.id as string,
    orgName: org.name as string,
    scenario: input.scenario,
    createdBy: input.createdBy,
    seed,
    seedTeamMembers,
  });

  logTestStep(log, "Step 4: Seeding complete organization data...");
  await seedAgencyScenario(admin, log, org.id as string, owner.userId, input.scenario, seed, {
    teamUserIds: teamUserIds.map((t) => ({ userId: t.userId, role: t.role })),
  });

  logTestStep(log, "Step 5: Verifying organization health...");
  const complete = await ensureAgencyOrganizationComplete(admin, {
    userId: owner.userId,
    organizationId: org.id as string,
    memberRole: "owner",
    scenario: input.scenario,
  });

  if (!complete.ok) {
    throwParsedError(log, "Step 5: Verify organization", new Error(complete.error), complete.error);
  }

  const verified = await verifyAgencyMembershipAdmin(admin, owner.userId);
  if (!verified.ok) {
    throwParsedError(log, "Step 5: Verify owner membership", new Error(verified.message), verified.message);
  }

  logTestStep(
    log,
    `Agency organization ready (${template.label}) — owner + ${teamUserIds.length} team members, ${template.artistCount} artists, ${template.bookingCount} bookings target.`
  );

  return {
    orgId: org.id as string,
    orgName: org.name as string,
    ownerUserId: owner.userId,
    ownerEmail: owner.email,
    scenario: input.scenario,
    teamUserIds,
    steps: log.steps,
  };
}

export async function bulkGenerateTestAgencies(input: {
  count: number;
  scenario: AgencyScenarioSlug;
  createdBy: string;
  seedTeamMembers?: boolean;
  onProgress?: (done: number, total: number) => void;
}) {
  const created: CreatedTestAgency[] = [];
  for (let i = 0; i < input.count; i++) {
    const agency = await createTestAgency({
      scenario: input.scenario,
      createdBy: input.createdBy,
      seedTeamMembers: input.seedTeamMembers ?? true,
      seed: Date.now() + i,
    });
    created.push(agency);
    input.onProgress?.(i + 1, input.count);
  }
  return created;
}

export { AGENCY_SCENARIOS };
