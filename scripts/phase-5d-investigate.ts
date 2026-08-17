import { execSync } from "child_process";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const raw = execSync("npx supabase projects api-keys --project-ref lblhjnzphvthnxulugep", {
    encoding: "utf8",
  });
  const key = JSON.parse(raw).keys.find((k: { name: string }) => k.name === "service_role").api_key;
  const admin = createClient("https://lblhjnzphvthnxulugep.supabase.co", key, {
    auth: { persistSession: false },
  });
  const toml = readFileSync(join(homedir(), ".config", "stripe", "config.toml"), "utf8");
  const sk = toml.match(/test_mode_api_key\s*=\s*['"]([^'"]+)['"]/)?.[1]!;
  const stripe = new Stripe(sk, { apiVersion: "2026-06-24.dahlia" as Stripe.LatestApiVersion });

  const refPId = "f4c16268-8c26-4258-a83e-83d215d68a4e";
  const dispId = "56d3952c-43bc-4457-9a4d-e7a50deaec50";

  const { data: refP } = await admin.from("orders").select("*").eq("id", refPId).single();
  const { data: refPTxns } = await admin
    .from("artist_balance_transactions")
    .select("*")
    .eq("order_id", refPId)
    .order("created_at", { ascending: true });
  const { data: refPWh } = await admin
    .from("monetization_stripe_webhook_events")
    .select("*")
    .eq("order_id", refPId);

  console.log("REF-P ORDER", JSON.stringify(refP, null, 2));
  console.log("REF-P LEDGER", JSON.stringify(refPTxns, null, 2));
  console.log("REF-P WEBHOOKS", JSON.stringify(refPWh, null, 2));

  const pi = await stripe.paymentIntents.retrieve(refP!.stripe_payment_intent_id as string, {
    expand: ["latest_charge.balance_transaction", "latest_charge.transfer", "latest_charge.application_fee"],
  });
  const ch = pi.latest_charge as Stripe.Charge;
  console.log("REF-P STRIPE", {
    pi: pi.id,
    status: pi.status,
    charge: ch.id,
    amount: ch.amount,
    appFee: ch.application_fee_amount,
    dest: ch.transfer_data?.destination,
    transfer:
      typeof ch.transfer === "string"
        ? ch.transfer
        : { id: ch.transfer?.id, amount: (ch.transfer as Stripe.Transfer)?.amount },
  });

  const transfer = await stripe.transfers.retrieve("tr_3U5FPsEJwfqaexCo1b9ucrn1");
  console.log("DISP TRANSFER", { id: transfer.id, amount: transfer.amount, destination: transfer.destination });

  const events = await stripe.events.list({ type: "charge.dispute.created", limit: 10 });
  console.log(
    "STRIPE DISPUTE EVENTS",
    JSON.stringify(
      events.data.map((e) => ({
        id: e.id,
        created: new Date(e.created * 1000).toISOString(),
        dispute: (e.data.object as Stripe.Dispute).id,
        charge: (e.data.object as Stripe.Dispute).charge,
      })),
      null,
      2,
    ),
  );

  const { data: balance } = await admin
    .from("artist_balances")
    .select("*")
    .eq("artist_id", "91b8850b-c145-4fa1-9167-0ba83cd329e8")
    .single();
  console.log("ARTIST BALANCE", balance);
  const ev = await stripe.events.retrieve("evt_1U5FPuEJwfqaexCozPs7f3R1");
  console.log(
    "DISPUTE EVENT DELIVERY",
    JSON.stringify(
      { id: ev.id, type: ev.type, pending_webhooks: ev.pending_webhooks, request: ev.request },
      null,
      2,
    ),
  );
}

main().catch(console.error);
