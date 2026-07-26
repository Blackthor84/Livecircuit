import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

type Props = {
  searchParams: Promise<{ next?: string; redirect?: string }>;
};

export default async function LoginPage(_props: Props) {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to join live shows and follow your favorite artists.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
