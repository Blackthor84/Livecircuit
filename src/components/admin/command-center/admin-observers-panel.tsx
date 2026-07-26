"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  grantObserverAccountAction,
  revokeObserverAccountAction,
  setObserverActiveAction,
} from "@/lib/actions/admin-observers";
import type { ObserverAccount } from "@/lib/auth/observer";

export function AdminObserversPanel({ accounts }: { accounts: ObserverAccount[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [label, setLabel] = useState("");

  function refresh() {
    router.refresh();
  }

  function grant() {
    startTransition(() => {
      void grantObserverAccountAction({ username, label: label || undefined })
        .then((result) => {
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Observer account granted");
            setUsername("");
            setLabel("");
            refresh();
          }
        })
        .catch(() => toast.error("Failed to grant observer"));
    });
  }

  function toggle(userId: string, active: boolean) {
    startTransition(() => {
      void setObserverActiveAction({ userId, active })
        .then((result) => {
          if (!result.ok) toast.error(result.error);
          else refresh();
        })
        .catch(() => toast.error("Failed to update observer"));
    });
  }

  function revoke(userId: string) {
    if (!window.confirm("Revoke observer access for this user?")) return;
    startTransition(() => {
      void revokeObserverAccountAction(userId)
        .then((result) => {
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Observer revoked");
            refresh();
          }
        })
        .catch(() => toast.error("Failed to revoke observer"));
    });
  }

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Grant observer access</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="observer-username">Username</Label>
            <Input
              id="observer-username"
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observer-label">Internal label (optional)</Label>
            <Input
              id="observer-label"
              placeholder="QA / A&R / Partner"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <Button type="button" disabled={pending || !username.trim()} onClick={grant}>
            Grant access
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Observer accounts ({accounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {!accounts.length ? (
            <p className="text-sm text-muted-foreground">
              No observer accounts yet. Observers can enter any event without a ticket and are excluded from public
              viewer counts and engagement metrics.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Granted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.user_id}>
                    <TableCell>
                      <p className="font-medium">
                        {account.profiles?.display_name ?? account.profiles?.username ?? account.user_id.slice(0, 8)}
                      </p>
                      {account.profiles?.username ? (
                        <p className="text-xs text-muted-foreground">@{account.profiles.username}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>{account.label ?? "—"}</TableCell>
                    <TableCell>{account.active ? "Active" : "Paused"}</TableCell>
                    <TableCell>{new Date(account.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => toggle(account.user_id, !account.active)}
                        >
                          {account.active ? "Pause" : "Activate"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={pending}
                          onClick={() => revoke(account.user_id)}
                        >
                          Revoke
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
