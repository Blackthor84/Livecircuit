import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create account" };

type Props = {
  searchParams: Promise<{ next?: string; redirect?: string }>;
};

export default async function RegisterPage(_props: Props) {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }

  return (
    <AuthShell title="Join LiveCircuit" subtitle="Map your city, discover tours, and never miss a live stop.">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
