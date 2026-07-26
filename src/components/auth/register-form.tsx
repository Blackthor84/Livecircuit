"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationAction, completeAuthSessionAction, signUpAction } from "@/lib/actions/auth";
import { readPostAuthParam } from "@/lib/auth/redirects";
import { stashReferralCodeAction } from "@/lib/actions/coins";
import { ROUTES } from "@/lib/constants";
import { UsernameField } from "@/components/auth/username-field";

export function RegisterForm() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") === "artist" ? "artist" : "fan";
  const refCode = searchParams.get("ref");
  const nextPath = readPostAuthParam({
    next: searchParams.get("next"),
    redirect: searchParams.get("redirect"),
  });
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (refCode?.trim()) {
      void stashReferralCodeAction(refCode.trim());
    }
  }, [refCode]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    form.set("role", role);
    const email = String(form.get("email"));

    const result = await signUpAction(form);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (result.needsEmailVerification) {
      setPendingEmail(email);
      toast.success("Check your email to verify your account.");
      return;
    }

    const session = await completeAuthSessionAction(searchParams.get("next"));
    if (!session.ok) {
      toast.error(session.error);
      return;
    }

    toast.success("Welcome to LiveCircuit!");
    window.location.assign(session.redirectTo);
  }

  async function resendVerification() {
    if (!pendingEmail) return;
    const fd = new FormData();
    fd.set("email", pendingEmail);
    const result = await resendVerificationAction(fd);
    if (result.ok) toast.success("Verification email sent.");
    else toast.error(result.error);
  }

  const loginHref =
    nextPath === "/"
      ? ROUTES.login
      : `${ROUTES.login}?next=${encodeURIComponent(nextPath)}`;

  if (pendingEmail) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">{pendingEmail}</span>. Open it to activate
          your account, then sign in.
        </p>
        <Button type="button" variant="secondary" className="w-full" onClick={resendVerification}>
          Resend verification email
        </Button>
        <Button href={loginHref} className="w-full">
          Continue to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      {nextPath !== "/" ? <input type="hidden" name="next" value={nextPath} /> : null}
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" required />
      </div>
      {role === "artist" ? <UsernameField required /> : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      <p className="text-xs text-muted-foreground">
        Registering as <strong className="capitalize text-foreground">{role}</strong>.{" "}
        <Link href={`/register?role=${role === "fan" ? "artist" : "fan"}`} className="text-primary">
          Switch
        </Link>
      </p>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginHref} className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
