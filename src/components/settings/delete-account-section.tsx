"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccountAction } from "@/lib/actions/account";

export function DeleteAccountSection() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    setLoading(true);
    const result = await deleteAccountAction(confirm);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Account deleted");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="max-w-md space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <div>
        <h3 className="font-medium text-destructive">Delete account</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently remove your profile, tickets, and orders. Type DELETE to confirm.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmDelete">Confirmation</Label>
        <Input id="confirmDelete" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button type="button" variant="destructive" disabled={loading} onClick={onDelete}>
        {loading ? "Deleting…" : "Delete my account"}
      </Button>
    </div>
  );
}
