import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionMocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: sessionMocks.getSessionUser,
  getProfile: sessionMocks.getProfile,
}));

vi.mock("@/lib/config/env", () => ({
  isSupabaseConfigured: () => true,
}));

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: fromMock,
  }),
}));

import { requireArtistContext } from "@/lib/auth/artist-context";

describe("requireArtistContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated users", async () => {
    sessionMocks.getSessionUser.mockResolvedValue(null);
    const result = await requireArtistContext();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("rejects non-artist roles", async () => {
    sessionMocks.getSessionUser.mockResolvedValue({ id: "user-1", email: "fan@test.com" });
    sessionMocks.getProfile.mockResolvedValue({ id: "user-1", role: "fan" });
    const result = await requireArtistContext();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("returns the authenticated user's artist record", async () => {
    sessionMocks.getSessionUser.mockResolvedValue({ id: "user-1", email: "artist@test.com" });
    sessionMocks.getProfile.mockResolvedValue({ id: "user-1", role: "artist" });
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "artist-1", slug: "nova-ray", stage_name: "Nova Ray", user_id: "user-1" },
            error: null,
          }),
        }),
      }),
    });

    const result = await requireArtistContext();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.artist.id).toBe("artist-1");
      expect(result.artist.user_id).toBe("user-1");
    }
  });
});
