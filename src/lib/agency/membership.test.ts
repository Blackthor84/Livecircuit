import { describe, expect, it } from "vitest";

describe("agency membership architecture", () => {
  it("documents canonical membership table", () => {
    expect("agency_organization_members").toBe("agency_organization_members");
  });

  it("session resolution is membership-first", () => {
    const flow = ["user", "agency_organization_members", "agency_organizations", "permissions"];
    expect(flow[1]).toBe("agency_organization_members");
  });
});
