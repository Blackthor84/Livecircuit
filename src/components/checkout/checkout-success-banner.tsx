"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CheckoutSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSuccess = searchParams.get("checkout") === "success";

  useEffect(() => {
    if (!isSuccess) return;
    toast.success("Payment confirmed — you're in!");
  }, [isSuccess]);

  if (!isSuccess) return null;

  function dismiss() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("checkout");
    const query = params.toString();
    router.replace(query ? `?${query}` : "?", { scroll: false });
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-emerald-100">Ticket confirmed</p>
        <p className="text-sm text-emerald-100/80">
          You can enter the waiting room now. The stream opens when the artist goes live.
        </p>
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={dismiss}>
        Dismiss
      </Button>
    </div>
  );
}
