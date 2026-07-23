"use client";

import { useEffect, useRef } from "react";
import { recordAdvertisementImpressionAction } from "@/lib/actions/sponsor-analytics";

export function AdvertisementImpressionBeacon({
  advertisementId,
  billboardId,
  venueId,
}: {
  advertisementId: string;
  billboardId?: string;
  venueId?: string;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || !advertisementId) return;
    sent.current = true;
    const sessionId =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("lc_session") ??
          (() => {
            const id = crypto.randomUUID();
            window.sessionStorage.setItem("lc_session", id);
            return id;
          })()
        : undefined;

    void recordAdvertisementImpressionAction({
      advertisementId,
      billboardId,
      venueId,
      sessionId,
    });
  }, [advertisementId, billboardId, venueId]);

  return null;
}
