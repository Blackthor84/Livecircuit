"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  refundOrderAction,
  reviewVerificationAction,
  updateReportAction,
} from "@/lib/actions/admin";
import { formatCents } from "@/lib/format";
import type {
  RefundableOrderItem,
  ReportQueueItem,
  VerificationQueueItem,
} from "@/lib/data/admin";

export function AdminVerificationPanel({ items }: { items: VerificationQueueItem[] }) {
  const router = useRouter();

  async function decide(
    requestId: string,
    decision: "approved" | "rejected",
    featureOnDiscover?: boolean
  ) {
    const result = await reviewVerificationAction({
      requestId,
      decision,
      featureOnDiscover,
    });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(decision === "approved" ? "Artist verified" : "Request rejected");
      router.refresh();
    }
  }

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No pending verification requests.</p>;
  }

  return (
    <ul className="space-y-4 text-sm">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-white/10 p-4">
          <p className="font-medium">{item.artist.stage_name}</p>
          <p className="text-muted-foreground">/{item.artist.slug}</p>
          {item.message ? <p className="mt-2">{item.message}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void decide(item.id, "approved", true)}>
              Approve + feature
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void decide(item.id, "approved", false)}
            >
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void decide(item.id, "rejected")}
            >
              Reject
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminModerationPanel({ items }: { items: ReportQueueItem[] }) {
  const router = useRouter();

  async function resolve(reportId: string, status: "resolved" | "dismissed" | "reviewing") {
    const result = await updateReportAction({ reportId, status });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Report updated");
      router.refresh();
    }
  }

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No open reports.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Report</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <p className="font-medium">{item.reason}</p>
              <p className="text-xs text-muted-foreground">
                {item.reporter?.display_name ?? "Reporter"} →{" "}
                {item.reported_user?.display_name ?? "User"}
              </p>
            </TableCell>
            <TableCell className="capitalize">{item.status}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => void resolve(item.id, "reviewing")}>
                  Review
                </Button>
                <Button type="button" size="sm" onClick={() => void resolve(item.id, "resolved")}>
                  Resolve
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void resolve(item.id, "dismissed")}>
                  Dismiss
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AdminRefundsPanel({ items }: { items: RefundableOrderItem[] }) {
  const router = useRouter();

  async function refund(orderId: string) {
    const reason = window.prompt("Refund reason (optional)") ?? "";
    const result = await refundOrderAction({ orderId, reason: reason.trim() || undefined });
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Refund submitted");
      router.refresh();
    }
  }

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No paid orders awaiting refund.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Buyer</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead className="text-right">Refund</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="capitalize">
              {item.order_type}
              <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p>
            </TableCell>
            <TableCell>{item.buyerLabel}</TableCell>
            <TableCell>{formatCents(item.total_cents, item.currency)}</TableCell>
            <TableCell className="text-right">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={!item.stripe_payment_intent_id}
                onClick={() => void refund(item.id)}
              >
                Refund
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
