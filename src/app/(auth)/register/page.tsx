import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthShell title="Join LiveCircuit" subtitle="Map your city, discover tours, and never miss a live stop.">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
