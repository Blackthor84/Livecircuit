"use client";

import Link from "next/link";
import { Award, Bell, BookOpen, Building2, Coins, Gamepad2, LayoutDashboard, LogOut, MessageCircle, Mic2, Settings, Users } from "lucide-react";
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
import { ROUTES } from "@/lib/constants";
import type { UserRole } from "@/types/database";

export type HeaderUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  sponsorPortal?: boolean;
  unreadNotifications?: number;
};

export function SiteHeaderUserMenu({ user }: { user: HeaderUser }) {
  const initials = (user.displayName ?? user.email).slice(0, 2).toUpperCase();
  const unreadCount = useUnreadNotifications(user.id, user.unreadNotifications ?? 0);

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
        <DropdownMenuItem render={<Link href={ROUTES.dashboard} className="flex items-center gap-2" />}>
          <LayoutDashboard className="size-4" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={ROUTES.passport} className="flex items-center gap-2" />}>
          <BookOpen className="size-4" />
          Fan Passport
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={ROUTES.achievements} className="flex items-center gap-2" />}>
          <Award className="size-4" />
          Achievements
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={ROUTES.venueCollections} className="flex items-center gap-2" />}>
          <Building2 className="size-4" />
          Venue collection
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={ROUTES.friends} className="flex items-center gap-2" />}>
          <Users className="size-4" />
          Friends
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={ROUTES.gamification} className="flex items-center gap-2" />}>
          <Gamepad2 className="size-4" />
          Gamification
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={ROUTES.coins} className="flex items-center gap-2" />}>
          <Coins className="size-4" />
          Coins
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={ROUTES.notifications} className="flex items-center gap-2" />}>
          <Bell className="size-4" />
          Notifications
          {unreadCount > 0 ? (
            <Badge variant="secondary" className="ml-auto text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={ROUTES.messages} className="flex items-center gap-2" />}>
          <MessageCircle className="size-4" />
          Messages
        </DropdownMenuItem>
        {(user.role === "artist" || user.role === "admin") && (
          <DropdownMenuItem render={<Link href="/artist/dashboard" className="flex items-center gap-2" />}>
            <Mic2 className="size-4" />
            Artist dashboard
          </DropdownMenuItem>
        )}
        {user.role === "admin" && (
          <DropdownMenuItem render={<Link href="/admin" className="flex items-center gap-2" />}>
            Admin
          </DropdownMenuItem>
        )}
        {(user.sponsorPortal || user.role === "admin") && (
          <DropdownMenuItem render={<Link href="/sponsor/dashboard" className="flex items-center gap-2" />}>
            Sponsor portal
          </DropdownMenuItem>
        )}
        <DropdownMenuItem render={<Link href={ROUTES.settings} className="flex items-center gap-2" />}>
          <Settings className="size-4" />
          Settings
        </DropdownMenuItem>
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
