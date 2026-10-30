import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FastPayAdminExceptionRow } from "@/lib/monetization/fastpay.server";
import { formatUsdFromCents } from "@/lib/monetization/artist-earnings-display";

export function AdminFastPayExceptionsPanel({ rows }: { rows: FastPayAdminExceptionRow[] }) {
  return (
    <Card className="glass-panel border-white/10">
      <CardHeader>
        <CardTitle>FastPay exceptions</CardTitle>
        <p className="text-sm text-muted-foreground">
          Held or cancelled-event ticket orders on FastPay that need SuperAdmin review. Production FastPay remains
          disabled until staging sign-off.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No FastPay exceptions requiring review.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground">
                  <th className="py-2 pr-4">Order</th>
                  <th className="py-2 pr-4">Event</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.orderId} className="border-b border-white/5">
                    <td className="py-2 pr-4 font-mono text-xs">{row.orderId.slice(0, 8)}…</td>
                    <td className="py-2 pr-4">
                      {row.eventTitle ?? "—"}
                      {row.eventStatus ? (
                        <span className="ml-1 text-xs text-muted-foreground">({row.eventStatus})</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4">{row.payoutStatus}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatUsdFromCents(row.pendingCents)}</td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {row.holdReason ?? (row.eventStatus === "cancelled" ? "event_cancelled" : "review")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
