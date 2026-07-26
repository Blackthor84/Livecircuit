import { describe, expect, it } from "vitest";
import { buildGoLiveNotification } from "@/lib/services/notifications.service";

describe("fulfillment helpers", () => {
  it("builds ticket confirmation copy", () => {
    expect(
      buildGoLiveNotification({
        stageName: "Nova Ray",
        eventTitle: "Midnight Session",
      }).title
    ).toBe("Nova Ray is live now");
  });
});
