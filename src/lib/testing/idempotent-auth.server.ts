import "server-only";

/**
 * @deprecated Import from `@/lib/testing/test-email.server` instead.
 */
export {
  allocateTestEmail,
  findAuthUserByEmail,
  resolveOrCreateTestAuthUser,
  stableAgencyRoleSeed,
  type AllocateTestEmailInput,
  type AllocatedTestEmail,
  type ResolveTestAuthUserInput,
  type ResolvedTestAuthUser,
} from "@/lib/testing/test-email.server";

export type { AgencyGenerationMode } from "@/lib/testing/constants";

import { fakePerson } from "@/lib/testing/fake-data";

/** @deprecated Use fakePerson(seed, role) — emails come from generateTestEmail. */
export function buildDeterministicTestPerson(seed: number, roleHint?: string) {
  return fakePerson(seed, roleHint ?? "fan");
}

/** @deprecated Use generateTestEmail from `@/lib/testing/test-email`. */
export { generateTestEmail as buildFreshTestEmail } from "@/lib/testing/test-email";
