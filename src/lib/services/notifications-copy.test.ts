import { describe, expect, it } from "vitest";
import { buildGoLiveNotification } from "@/lib/services/notifications.service";

describe("buildGoLiveNotification", () => {
  it("formats follower alert copy", () => {
    expect(
      buildGoLiveNotification({
        stageName: "Nova Ray",
        eventTitle: "Midnight Session",
      })
    ).toEqual({
      title: "Nova Ray is live now",
      body: 'Join "Midnight Session" before it ends.',
    });
  });
});
