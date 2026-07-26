"use client";

import { LogOut } from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import { signOutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
  showIcon?: boolean;
} & Pick<VariantProps<typeof buttonVariants>, "variant" | "size">;

/** Clear Supabase client session, then run server sign-out and redirect home. */
export async function performSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  await signOutAction();
}

export function SignOutButton({
  className,
  variant = "ghost",
  size = "sm",
  showIcon = true,
}: SignOutButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={() => void performSignOut()}
    >
      {showIcon ? <LogOut className="size-4" /> : null}
      Sign Out
    </Button>
  );
}
