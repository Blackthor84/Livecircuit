"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationAction, signUpAction } from "@/lib/actions/auth";
import { stashReferralCodeAction } from "@/lib/actions/coins";
import { ROUTES } from "@/lib/constants";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") === "artist" ? "artist" : "fan";
  const refCode = searchParams.get("ref");
  const [loading, setLoading] = useState(false);

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

    const result = await signUpAction(form);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Check your email to verify your account, then sign in.");
    router.push(ROUTES.login);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" required />
      </div>
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
        <Link href={ROUTES.login} className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
