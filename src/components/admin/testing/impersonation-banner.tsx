"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatRoleBadge } from "@/lib/features/account-menu";
import type { ImpersonationCookiePayload } from "@/lib/testing/constants";

export function ImpersonationBanner({ state }: { state: ImpersonationCookiePayload }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function stopImpersonating() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/testing/stop-impersonate", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; redirect?: string; error?: string };
      if (data.ok) {
        router.push(data.redirect ?? "/admin/testing");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sticky top-0 z-[100] border-b border-amber-500/40 bg-amber-950/95 px-4 py-2 text-center text-sm text-amber-100 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="font-semibold uppercase tracking-wider text-amber-300">Test Mode</span>
        <span>
          Impersonating: <strong>{state.displayName ?? "Test user"}</strong> ·{" "}
          {formatRoleBadge(state.role as never)}
          {state.scenario ? ` · ${state.scenario.replace(/_/g, " ")}` : ""}
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30"
          disabled={loading}
          onClick={() => void stopImpersonating()}
        >
          Return to Admin
        </Button>
      </div>
    </div>
  );
}
