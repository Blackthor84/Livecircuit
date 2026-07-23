"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationAction, finalizeSessionAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? ROUTES.discover;
  const authError = searchParams.get("error");
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [lastEmail, setLastEmail] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setLastEmail(email);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setShowResend(true);
      }
      toast.error(error.message);
      return;
    }
    await finalizeSessionAction();
    toast.success("Welcome back!");
    router.push(redirect);
    router.refresh();
  }

  async function signInWithProvider(provider: "google" | "apple") {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    });
    if (error) toast.error(error.message);
  }

  async function resendVerification() {
    if (!lastEmail) {
      toast.error("Enter your email above first.");
      return;
    }
    const fd = new FormData();
    fd.set("email", lastEmail);
    const result = await resendVerificationAction(fd);
    if (result.ok) toast.success("Verification email sent.");
    else toast.error(result.error);
  }

  return (
    <div className="space-y-6">
      {authError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Sign-in link expired or invalid. Try again.
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href={ROUTES.forgotPassword} className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      {showResend && (
        <Button type="button" variant="secondary" className="w-full" onClick={resendVerification}>
          Resend verification email
        </Button>
      )}
      <div className="grid gap-2">
        <Button type="button" variant="outline" onClick={() => signInWithProvider("google")}>
          Continue with Google
        </Button>
        <Button type="button" variant="outline" onClick={() => signInWithProvider("apple")}>
          Continue with Apple
        </Button>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href={ROUTES.register} className="text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
