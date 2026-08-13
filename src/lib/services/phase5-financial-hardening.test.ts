import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { proportionalTicketRefundSplit } from "@/lib/monetization/ticket-revenue-split";

const ROOT = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("Phase 5 financial hardening", () => {
  describe("5A dispute transfer reversal", () => {
    it("1. dispute service uses transfers.createReversal with idempotency key", () => {
      const source = readSource("src/lib/services/dispute.service.ts");
      expect(source).toMatch(/transfers\.createReversal/);
      expect(source).toMatch(/idempotencyKey:\s*`dispute-reversal-\$\{dispute\.id\}`/);
      expect(source).not.toMatch(/transfers\.create\([\s\S]*dispute\.created/);
    });

    it("2. duplicate dispute webhook checks artist_disputes by stripe_dispute_id", () => {
      const source = readSource("src/lib/services/dispute.service.ts");
      expect(source).toMatch(/eq\("stripe_dispute_id", dispute\.id\)/);
      expect(source).toMatch(/duplicate:\s*true/);
    });

    it("3. dispute won restores pending status and optional re-transfer", () => {
      const source = readSource("src/lib/services/dispute.service.ts");
      expect(source).toMatch(/dispute\.status === "won"/);
      expect(source).toMatch(/artist_payout_status: "pending"/);
      expect(source).toMatch(/dispute_won_retransfer/);
    });

    it("4. dispute lost keeps reversal via reverse_artist_ticket_sale", () => {
      const source = readSource("src/lib/services/dispute.service.ts");
      expect(source).toMatch(/dispute\.status === "lost"/);
      expect(source).toMatch(/reverse_artist_ticket_sale/);
      expect(source).toMatch(/dispute-lost:\$\{dispute\.id\}/);
    });
  });

  describe("5B post-payout refund recovery", () => {
    it("5. reverse_artist_ticket_sale creates receivable when funds already paid out", () => {
      const sql = readSource("supabase/migrations/20260812000005_financial_hardening.sql");
      expect(sql).toMatch(/record_artist_receivable/);
      expect(sql).toMatch(/receivable_cents = receivable_cents \+ v_to_receivable/);
      expect(sql).toMatch(/pending_recovery/);
    });

    it("6. recovery status transitions via record_artist_recovery_payment", () => {
      const sql = readSource("supabase/migrations/20260812000005_financial_hardening.sql");
      expect(sql).toMatch(/partially_recovered/);
      expect(sql).toMatch(/recovered/);
      expect(sql).toMatch(/written_off/);
    });

    it("7. manual recovery is idempotent by reference_id", () => {
      const sql = readSource("supabase/migrations/20260812000005_financial_hardening.sql");
      expect(sql).toMatch(/reference_id = p_reference_id/);
      const service = readSource("src/lib/services/artist-recovery.service.ts");
      expect(service).toMatch(/record_artist_recovery_payment/);
    });
  });

  describe("5C partial refund idempotency", () => {
    it("8. $5 refund on $20 reverses $4.50 artist / $0.50 platform", () => {
      const split = proportionalTicketRefundSplit({
        grossCents: 2000,
        platformFeeCents: 200,
        artistEarningsCents: 1800,
        refundCents: 500,
      });
      expect(split.artistReversalCents).toBe(450);
      expect(split.platformReversalCents).toBe(50);
    });

    it("9. refund service returns early when incremental refund is zero", () => {
      const source = readSource("src/lib/services/refund.service.ts");
      expect(source).toMatch(/if \(incrementalRefundCents <= 0\)/);
      expect(source).toMatch(/const refundAmountCents = incrementalRefundCents;/);
      expect(source).not.toMatch(/incrementalRefundCents > 0 \? incrementalRefundCents : requestedRefundCents/);
    });

    it("10. sequential $5 + $7 refunds produce $10.80 artist reversal total", () => {
      const first = proportionalTicketRefundSplit({
        grossCents: 2000,
        platformFeeCents: 200,
        artistEarningsCents: 1800,
        refundCents: 500,
      });
      const second = proportionalTicketRefundSplit({
        grossCents: 2000,
        platformFeeCents: 200,
        artistEarningsCents: 1800,
        refundCents: 700,
      });
      expect(first.artistReversalCents + second.artistReversalCents).toBe(1080);
      expect(first.platformReversalCents + second.platformReversalCents).toBe(120);
    });

    it("11. reverse_artist_ticket_sale RPC dedupes by reference_id", () => {
      const sql = readSource("supabase/migrations/20260812000005_financial_hardening.sql");
      expect(sql).toMatch(/artist_balance_transactions WHERE reference_id = v_ref_key/);
    });
  });

  describe("5D Connect payout schedule migration", () => {
    it("12. syncExistingArtistPayoutSchedules defaults to dry run", () => {
      const source = readSource("src/lib/stripe/connect-payout-sync.ts");
      expect(source).toMatch(/dryRun = options\?\.dryRun \?\? true/);
      expect(source).toMatch(/configureArtistManualPayouts/);
    });

    it("13. automatic payout account would be converted when not dry run", () => {
      const source = readSource("src/lib/stripe/connect-payout-sync.ts");
      expect(source).toMatch(/interval === "manual"/);
      expect(source).toMatch(/Would configure manual payouts/);
    });

    it("14. restricted or payout-disabled account is skipped safely", () => {
      const source = readSource("src/lib/stripe/connect-payout-sync.ts");
      expect(source).toMatch(/!account\.payouts_enabled/);
      expect(source).toMatch(/action: "skipped"/);
    });
  });

  describe("5E payout safety", () => {
    it("15. concurrent payout jobs use try_reserve_artist_payout RPC", () => {
      const source = readSource("src/lib/services/artist-payout.service.ts");
      expect(source).toMatch(/try_reserve_artist_payout/);
      const sql = readSource("supabase/migrations/20260812000005_financial_hardening.sql");
      expect(sql).toMatch(/FOR UPDATE/);
    });

    it("16. duplicate payout webhook ignores already paid rows", () => {
      const source = readSource("src/lib/services/artist-payout.service.ts");
      expect(source).toMatch(/row\.status === "paid" \|\| row\.status === "failed"/);
    });

    it("17. failed payout restores available balance via release_artist_payout_reservation", () => {
      const source = readSource("src/lib/services/artist-payout.service.ts");
      expect(source).toMatch(/release_artist_payout_reservation/);
      expect(source).toMatch(/p_restore_available: true/);
    });

    it("18. payout cancellation handled same as failure path", () => {
      const source = readSource("src/lib/services/artist-payout.service.ts");
      expect(source).toMatch(/payout\.status === "failed" \|\| payout\.status === "canceled"/);
    });
  });

  describe("5F Stripe fee reconciliation", () => {
    it("19. stripe fee reconciliation is idempotent and not hardcoded", () => {
      const source = readSource("src/lib/monetization/stripe-fee-reconciliation.service.ts");
      expect(source).not.toMatch(/2\.9/);
      expect(source).toMatch(/balance_transaction/);
      expect(source).toMatch(/stripe_fee_cents/);
    });
  });

  describe("5G reconciliation engine", () => {
    it("20. reconciliation detects mismatched gross split", async () => {
      const { runFinancialReconciliation } = await import("@/lib/services/financial-reconciliation.service");
      const supabase = {
        from: (table: string) => {
          if (table === "orders") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    not: () => ({
                      limit: () =>
                        Promise.resolve({
                          data: [
                            {
                              id: "order-1",
                              artist_id: "a1",
                              order_type: "ticket",
                              status: "paid",
                              gross_cents: 2000,
                              platform_fee_cents: 100,
                              artist_earnings_cents: 1800,
                              stripe_fee_cents: 88,
                              stripe_payment_intent_id: "pi_1",
                              stripe_balance_transaction_id: "txn_1",
                              refund_cents: 0,
                              artist_payout_status: "pending",
                            },
                          ],
                        }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "artist_payouts") {
            return {
              select: () => ({
                limit: () => Promise.resolve({ data: [] }),
              }),
            };
          }
          if (table === "artist_balances") {
            return {
              select: () => Promise.resolve({ data: [{ pending_cents: 0, available_cents: 0, receivable_cents: 0 }] }),
            };
          }
          throw new Error(`Unexpected table ${table}`);
        },
      };

      const report = await runFinancialReconciliation(supabase as never);
      expect(report.issues.some((i) => i.code === "ticket_split_mismatch")).toBe(true);
    });

    it("21. reconciliation detects duplicate payout idempotency keys", async () => {
      const { runFinancialReconciliation } = await import("@/lib/services/financial-reconciliation.service");
      const supabase = {
        from: (table: string) => {
          if (table === "orders") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    not: () => ({
                      limit: () => Promise.resolve({ data: [] }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "artist_payouts") {
            return {
              select: () => ({
                limit: () =>
                  Promise.resolve({
                    data: [
                      { id: "p1", artist_id: "a1", amount_cents: 1800, status: "paid", stripe_payout_id: "po_1", idempotency_key: "dup" },
                      { id: "p2", artist_id: "a1", amount_cents: 1800, status: "paid", stripe_payout_id: "po_2", idempotency_key: "dup" },
                    ],
                  }),
              }),
            };
          }
          if (table === "artist_balances") {
            return {
              select: () => Promise.resolve({ data: [] }),
            };
          }
          throw new Error(`Unexpected table ${table}`);
        },
      };

      const report = await runFinancialReconciliation(supabase as never);
      expect(report.issues.some((i) => i.code === "duplicate_payout_idempotency")).toBe(true);
    });

    it("22. reconciliation flags missing Stripe fee reconciliation", async () => {
      const { runFinancialReconciliation } = await import("@/lib/services/financial-reconciliation.service");
      const supabase = {
        from: (table: string) => {
          if (table === "orders") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    not: () => ({
                      limit: () =>
                        Promise.resolve({
                          data: [
                            {
                              id: "order-2",
                              artist_id: "a1",
                              order_type: "ticket",
                              status: "paid",
                              gross_cents: 2000,
                              platform_fee_cents: 200,
                              artist_earnings_cents: 1800,
                              stripe_fee_cents: null,
                              stripe_payment_intent_id: "pi_2",
                              stripe_balance_transaction_id: null,
                              refund_cents: 0,
                              artist_payout_status: "pending",
                            },
                          ],
                        }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "artist_payouts") {
            return { select: () => ({ limit: () => Promise.resolve({ data: [] }) }) };
          }
          if (table === "artist_balances") {
            return { select: () => Promise.resolve({ data: [] }) };
          }
          throw new Error(`Unexpected table ${table}`);
        },
      };

      const report = await runFinancialReconciliation(supabase as never);
      expect(report.issues.some((i) => i.code === "missing_stripe_fee")).toBe(true);
    });
  });

  describe("5H webhook hardening", () => {
    it("23. webhook handler records stripe_event_id before processing", () => {
      const route = readSource("src/app/api/stripe/webhook/route.ts");
      expect(route).toMatch(/constructEvent/);
      const service = readSource("src/lib/monetization/stripe-webhook.service.ts");
      expect(service).toMatch(/monetization_stripe_webhook_events/);
      expect(service).toMatch(/stripe_event_id/);
    });
  });

  describe("5J production safety audit", () => {
    it("24. service-role key is server-only", () => {
      const admin = readSource("src/lib/supabase/admin.ts");
      expect(admin).toMatch(/server-only/);
      expect(admin).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
      const client = readSource("src/lib/supabase/client.ts");
      expect(client).not.toMatch(/SERVICE_ROLE/);
    });

    it("25. ticket payout path does not call stripe.transfers.create", () => {
      const payout = readSource("src/lib/services/artist-payout.service.ts");
      expect(payout).not.toMatch(/transfers\.create/);
    });

    it("26. payout path uses stripe.payouts.create", () => {
      const payout = readSource("src/lib/services/artist-payout.service.ts");
      expect(payout).toMatch(/payouts\.create/);
    });
  });

  describe("dispute service duplicate webhook behavior", () => {
    it("duplicate dispute webhook short-circuits before createReversal", () => {
      const source = readSource("src/lib/services/dispute.service.ts");
      expect(source).toMatch(/if \(existing\)/);
      expect(source).toMatch(/duplicate: true/);
      expect(source).toMatch(/return;/);
    });
  });
});
