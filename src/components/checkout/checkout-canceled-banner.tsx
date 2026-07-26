"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CheckoutCanceledBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("canceled") !== "1") return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
      Checkout was canceled. You can try again when ready.
    </div>
  );
}
