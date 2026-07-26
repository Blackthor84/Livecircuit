"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  LogOut,
  Mic2,
  PlusCircle,
  Settings,
  Shield,
  Terminal,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { performSignOut } from "@/components/auth/sign-out-button";
import { getUserMenuItems } from "@/lib/features/navigation";

export type HeaderUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: import("@/types/database").UserRole;
  sponsorPortal?: boolean;
  unreadNotifications?: number;
};

function menuIcon(label: string) {
  switch (label) {
    case "My Profile":
      return <User className="size-4" />;
    case "Settings":
      return <Settings className="size-4" />;
    case "Artist Dashboard":
      return <Mic2 className="size-4" />;
    case "Create Event":
      return <PlusCircle className="size-4" />;
    case "Admin Dashboard":
      return <Shield className="size-4" />;
    case "Command Center":
      return <Terminal className="size-4" />;
    default:
      return <LayoutDashboard className="size-4" />;
  }
}

export function SiteHeaderUserMenu({ user }: { user: HeaderUser }) {
  const initials = (user.displayName ?? user.email).slice(0, 2).toUpperCase();
  const menuItems = getUserMenuItems(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-9 items-center justify-center rounded-full outline-none ring-ring focus-visible:ring-2"
        aria-label="Profile menu"
      >
        <Avatar className="size-9">
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
          <DropdownMenuItem
            key={`${item.href}-${item.label}`}
            render={<Link href={item.href} className="flex items-center gap-2" />}
          >
            {menuIcon(item.label)}
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void performSignOut()}>
          <LogOut className="size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
