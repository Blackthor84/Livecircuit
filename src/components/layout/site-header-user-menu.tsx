"use client";

import Link from "next/link";
import { Bell, LayoutDashboard, LogOut, Mic2, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/actions/auth";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { getUserMenuItems } from "@/lib/features/navigation";
import { ROUTES } from "@/lib/constants";

export type HeaderUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: import("@/types/database").UserRole;
  sponsorPortal?: boolean;
  unreadNotifications?: number;
};

export function SiteHeaderUserMenu({ user }: { user: HeaderUser }) {
  const initials = (user.displayName ?? user.email).slice(0, 2).toUpperCase();
  const unreadCount = useUnreadNotifications(user.id, user.unreadNotifications ?? 0);
  const menuItems = getUserMenuItems(user);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        href={ROUTES.notifications}
        className="relative hidden sm:inline-flex"
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        ) : null}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex size-8 items-center justify-center rounded-full outline-none ring-ring focus-visible:ring-2"
          aria-label="Account menu"
        >
          <Avatar className="size-8">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium">{user.displayName ?? "Account"}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {menuItems.map((item) => (
            <DropdownMenuItem key={item.href} render={<Link href={item.href} className="flex items-center gap-2" />}>
              {item.label === "Artist dashboard" ? <Mic2 className="size-4" /> : null}
              {item.label === "My Events" ? <LayoutDashboard className="size-4" /> : null}
              {item.label === "Profile" ? <Settings className="size-4" /> : null}
              {item.label === "Notifications" ? <Bell className="size-4" /> : null}
              {item.label}
              {item.label === "Notifications" && unreadCount > 0 ? (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => void signOutAction()}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
