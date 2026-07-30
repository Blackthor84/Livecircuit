import { createTestUser } from "@/lib/testing/create-user";
import type { TestScenarioSlug, TestUserType } from "@/lib/testing/constants";
import { ARTIST_SCENARIOS, FAN_SCENARIOS } from "@/lib/testing/constants";

export async function bulkGenerateTestUsers(input: {
  count: number;
  mix: "fans" | "artists" | "mixed";
  createdBy: string;
  onProgress?: (done: number, total: number) => void;
}) {
  const created = [];
  for (let i = 0; i < input.count; i++) {
    const type: TestUserType =
      input.mix === "fans"
        ? "fan"
        : input.mix === "artists"
          ? "artist"
          : i % 3 === 0
            ? "artist"
            : "fan";

    const scenarios = type === "fan" ? FAN_SCENARIOS : ARTIST_SCENARIOS;
    const scenario = scenarios[i % scenarios.length]!.slug as TestScenarioSlug;

    const user = await createTestUser({
      type,
      scenario,
      createdBy: input.createdBy,
      seed: Date.now() + i,
    });
    created.push(user);
    input.onProgress?.(i + 1, input.count);
  }
  return created;
}
