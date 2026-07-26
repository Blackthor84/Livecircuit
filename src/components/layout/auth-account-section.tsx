import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { HeaderUser } from "@/components/layout/site-header-user-menu";
import { getAccountMenuLinks } from "@/lib/features/account-menu";
import { getGuestAuthCTAs } from "@/lib/features/navigation";
import { cn } from "@/lib/utils";

type Props = {
  user: HeaderUser | null;
  className?: string;
  align?: "left" | "right";
};

export function AuthAccountSection({ user, className, align = "left" }: Props) {
  if (!user) {
    const ctas = getGuestAuthCTAs();
    return (
      <div className={cn(className, align === "right" && "md:text-right")}>
        <p className="text-sm font-medium">Get Started</p>
        <div
          className={cn(
            "mt-4 flex flex-wrap gap-x-4 gap-y-2",
            align === "right" && "md:justify-end"
          )}
        >
          {ctas.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "text-sm hover:underline",
                item.label === "Get Started" || item.label === "Create Account"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const menuItems = getAccountMenuLinks(user);

  return (
    <div className={cn(className, align === "right" && "md:text-right")}>
      <div
        className={cn(
          "flex flex-col gap-2",
          align === "right" && "md:items-end"
        )}
      >
        {menuItems.map((item) => (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
        <SignOutButton
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto justify-start p-0 text-sm text-muted-foreground hover:text-foreground",
            align === "right" && "md:justify-end"
          )}
        />
      </div>
    </div>
  );
}
