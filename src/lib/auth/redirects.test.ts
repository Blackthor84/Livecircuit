import { describe, expect, it } from "vitest";
import { readPostAuthParam, resolvePostAuthPath } from "@/lib/auth/redirects";

describe("resolvePostAuthPath", () => {
  it("defaults to home when input is missing", () => {
    expect(resolvePostAuthPath(null)).toBe("/");
    expect(resolvePostAuthPath(undefined)).toBe("/");
    expect(resolvePostAuthPath("")).toBe("/");
  });

  it("accepts safe internal paths", () => {
    expect(resolvePostAuthPath("/dashboard")).toBe("/dashboard");
    expect(resolvePostAuthPath("/admin/health")).toBe("/admin/health");
  });

  it("blocks auth loop paths", () => {
    expect(resolvePostAuthPath("/login")).toBe("/");
    expect(resolvePostAuthPath("/register")).toBe("/");
    expect(resolvePostAuthPath("/auth/callback")).toBe("/");
    expect(resolvePostAuthPath("/forgot-password")).toBe("/");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(resolvePostAuthPath("//evil.com")).toBe("/");
    expect(resolvePostAuthPath("https://evil.com")).toBe("/");
  });
});

describe("readPostAuthParam", () => {
  it("prefers next over legacy redirect", () => {
    expect(readPostAuthParam({ next: "/dashboard", redirect: "/settings" })).toBe("/dashboard");
  });

  it("falls back to redirect when next is absent", () => {
    expect(readPostAuthParam({ redirect: "/following" })).toBe("/following");
  });
});
