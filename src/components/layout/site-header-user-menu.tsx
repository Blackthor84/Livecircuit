"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { performSignOut } from "@/components/auth/sign-out-button";
import {
  formatRoleBadge,
  getAccountMenuSections,
  roleBadgeClass,
  type AccountMenuItem,
} from "@/lib/features/account-menu";
import { cn } from "@/lib/utils";

export type HeaderUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: import("@/types/database").UserRole;
  sponsorPortal?: boolean;
  unreadNotifications?: number;
};

function MenuLink({ item }: { item: AccountMenuItem }) {
  const Icon = item.icon;
  return (
    <DropdownMenuItem render={<Link href={item.href} className="flex w-full items-center gap-2" />}>
      {item.emoji ? <span className="text-base leading-none">{item.emoji}</span> : null}
      {Icon ? <Icon className="size-4 shrink-0 opacity-70" /> : null}
      <span className="truncate">{item.label}</span>
    </DropdownMenuItem>
  );
}

export function SiteHeaderUserMenu({ user }: { user: HeaderUser }) {
  const [open, setOpen] = useState(false);
  const initials = (user.displayName ?? user.email).slice(0, 2).toUpperCase();
  const displayLabel = user.displayName?.trim() || "Account";
  const sections = getAccountMenuSections(user);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${displayLabel}`}
        className={cn(
          "group flex h-9 max-w-[220px] items-center gap-2 rounded-full border border-white/10 bg-white/5 pl-1 pr-2.5",
          "outline-none transition-all duration-200",
          "hover:border-primary/40 hover:bg-primary/10 hover:shadow-md hover:shadow-primary/10",
          "focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40",
          "data-open:border-primary/40 data-open:bg-primary/10 data-open:shadow-md data-open:shadow-primary/10"
        )}
      >
        <Avatar className="size-7 ring-2 ring-primary/20">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden truncate text-sm font-medium sm:inline">{displayLabel}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary"
          )}
          aria-hidden
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 overflow-hidden rounded-xl border border-white/10 bg-popover/95 p-0 shadow-xl shadow-black/30 backdrop-blur-xl data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
      >
        <div className="border-b border-white/10 bg-gradient-to-br from-primary/10 via-transparent to-transparent px-4 py-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-11 ring-2 ring-primary/30">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-primary/20 text-sm font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{displayLabel}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <Badge
                variant="outline"
                className={cn("mt-2 text-[10px] font-semibold tracking-wider", roleBadgeClass(user.role))}
              >
                {formatRoleBadge(user.role)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="p-1.5">
          {sections.map((section, index) => (
            <div key={index}>
              {index > 0 ? <DropdownMenuSeparator className="my-1.5" /> : null}
              {section.items.map((item) => (
                <MenuLink key={`${item.href}-${item.label}`} item={item} />
              ))}
            </div>
          ))}

          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => void performSignOut()}
            className="gap-2 font-medium"
          >
            <LogOut className="size-4" />
            Sign Out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
