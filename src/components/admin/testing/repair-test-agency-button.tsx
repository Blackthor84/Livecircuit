"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { repairTestAgencyAccountAction } from "@/lib/actions/testing";

export function RepairTestAgencyButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        void repairTestAgencyAccountAction(userId)
          .then((result) => {
            if (!result.ok) toast.error(result.error ?? "Repair failed");
            else {
              toast.success(result.message ?? "Test agency repaired");
              router.refresh();
            }
          })
          .finally(() => setLoading(false));
      }}
    >
      {loading ? "Repairing…" : "Repair Test Account"}
    </Button>
  );
}
