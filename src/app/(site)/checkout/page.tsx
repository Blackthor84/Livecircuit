import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <Suspense fallback={<p className="text-muted-foreground">Loading checkout…</p>}>
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
