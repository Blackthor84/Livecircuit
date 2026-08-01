"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleCountryEnabledAction } from "@/lib/actions/geo-admin";

export function CountryEnableToggle({
  countryId,
  initialEnabled,
  countryName,
}: {
  countryId: string;
  initialEnabled: boolean;
  countryName: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const result = await toggleCountryEnabledAction(countryId, !enabled);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setEnabled(!enabled);
    toast.success(
      !enabled
        ? `${countryName} enabled for touring`
        : `${countryName} disabled — hidden from artist geo pickers`
    );
  }

  return (
    <Button type="button" size="sm" variant={enabled ? "secondary" : "outline"} disabled={loading} onClick={toggle}>
      {loading ? "…" : enabled ? "Enabled" : "Enable"}
    </Button>
  );
}
