/**
 * Client-safe Testing Center public API.
 * For server-only test generation use `@/lib/testing/server`.
 */

export { formatTestAccountRoleLabel } from "./list.utils";
export type { TestAccountRow } from "./list.utils";

export type { AgencyGenerationMode } from "./constants";
export { AGENCY_GENERATION_MODES } from "./constants";
export {
  TEST_EMAIL_DOMAIN,
  generateTestEmail,
  generateTestUsername,
  isTestEmailAddress,
  type TestEmailRole,
} from "./test-email";
export type { AgencyScenarioSlug } from "@/lib/agency";
export { AGENCY_SCENARIOS, AGENCY_TEAM_ROLES } from "@/lib/agency";
