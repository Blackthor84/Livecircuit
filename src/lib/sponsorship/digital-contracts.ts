import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import { CONTRACT_SELECT, mapBusinessContract } from "@/lib/sponsorship/contracts";
import { CONTRACT_LENGTH_LABELS, PAYMENT_FREQUENCY_OPTIONS } from "@/lib/sponsorship/constants";
import { formatCents } from "@/lib/format";

export type ContractDocument = {
  id: string;
  contractId: string;
  version: number;
  title: string;
  contentHtml: string;
  signedAt: string | null;
  signedByName: string | null;
  status: string;
  createdAt: string;
};

export function buildContractHtml(contract: ReturnType<typeof mapBusinessContract>): string {
  const lengthLabel =
    contract.contractLengthMonths != null
      ? CONTRACT_LENGTH_LABELS[contract.contractLengthMonths] ?? `${contract.contractLengthMonths} months`
      : "Custom";

  const paymentLabel =
    PAYMENT_FREQUENCY_OPTIONS.find((p) => p.id === contract.paymentFrequency)?.label ??
    contract.paymentFrequency ??
    "Annual";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>LiveCircuit Sponsorship Agreement — ${contract.displayLabel}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 2rem auto; color: #111; line-height: 1.6; }
    h1 { font-size: 1.5rem; border-bottom: 2px solid #111; padding-bottom: 0.5rem; }
    h2 { font-size: 1.1rem; margin-top: 1.5rem; }
    .meta { color: #555; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    td { padding: 0.4rem 0; vertical-align: top; }
    td:first-child { width: 38%; font-weight: 600; }
    .signature { margin-top: 3rem; border-top: 1px solid #ccc; padding-top: 1rem; }
  </style>
</head>
<body>
  <p class="meta">LiveCircuit Premium Sponsorship Agreement</p>
  <h1>${contract.displayLabel}</h1>
  <p class="meta">Contract ID: ${contract.id.slice(0, 8)}… · Generated ${new Date().toLocaleDateString()}</p>

  <h2>Parties</h2>
  <table>
    <tr><td>Sponsor</td><td>${contract.organizationName ?? contract.displayLabel}</td></tr>
    <tr><td>Contact</td><td>${contract.contactName ?? "—"} · ${contract.contactEmail ?? "—"}</td></tr>
    <tr><td>Venue / Scope</td><td>${contract.venueName ?? "Platform-wide"} · ${contract.slotName}</td></tr>
  </table>

  <h2>Rights Purchased</h2>
  <table>
    <tr><td>Sponsorship type</td><td>${contract.slotName}</td></tr>
    <tr><td>Display name</td><td>${contract.displayLabel}</td></tr>
    <tr><td>Exclusivity</td><td>One sponsor per slot — premium exclusive inventory</td></tr>
  </table>

  <h2>Term &amp; Pricing</h2>
  <table>
    <tr><td>Contract length</td><td>${lengthLabel}${contract.customContractLength ? " (custom)" : ""}</td></tr>
    <tr><td>Start date</td><td>${contract.contractStartsAt ?? "Upon activation"}</td></tr>
    <tr><td>End date</td><td>${contract.contractEndsAt ?? "—"}</td></tr>
    <tr><td>Total contract value</td><td>${formatCents(contract.contractValueCents)}</td></tr>
    <tr><td>Payment schedule</td><td>${paymentLabel}${contract.customPaymentPlan ? ` — ${contract.customPaymentPlan}` : ""}</td></tr>
  </table>

  <h2>Renewal Terms</h2>
  <table>
    <tr><td>Auto-renew</td><td>${contract.autoRenew ? "Enabled" : "Disabled"}</td></tr>
    <tr><td>First right of renewal</td><td>${contract.renewalStatus !== "not_due" ? "As specified in contract metadata" : "Per program terms"}</td></tr>
    <tr><td>Renewal status</td><td>${contract.renewalStatus}</td></tr>
  </table>

  <h2>Cancellation</h2>
  <p>Either party may terminate per the LiveCircuit Sponsorship Terms. Upon expiration or cancellation, display rights revert and inventory may enter auction or waiting list per platform policy.</p>

  ${contract.notes ? `<h2>Additional Notes</h2><p>${contract.notes}</p>` : ""}

  <div class="signature">
    <p><strong>Digital Signature</strong></p>
    <p>Name: _____________________________ Date: _______________</p>
    <p>LiveCircuit Authorized Representative: _____________________________</p>
  </div>
</body>
</html>`;
}

export async function generateContractDocument(contractId: string, createdBy?: string) {
  if (!isSupabaseConfigured()) return null;

  const admin = getSupabaseAdmin();
  const { data: row } = await admin
    .from("premium_sponsorship_contracts")
    .select(CONTRACT_SELECT)
    .eq("id", contractId)
    .maybeSingle();

  if (!row) return null;

  const contract = mapBusinessContract(row as Record<string, unknown>);
  const { count } = await admin
    .from("sponsorship_contract_documents")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", contractId);

  const version = (count ?? 0) + 1;
  const contentHtml = buildContractHtml(contract);

  const { data, error } = await admin
    .from("sponsorship_contract_documents")
    .insert({
      contract_id: contractId,
      version,
      title: `Sponsorship Agreement — ${contract.displayLabel} (v${version})`,
      content_html: contentHtml,
      content_json: { contractId, version, generatedAt: new Date().toISOString() },
      status: "draft",
      created_by: createdBy ?? null,
    })
    .select("*")
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    contractId: data.contract_id as string,
    version: data.version as number,
    title: data.title as string,
    contentHtml: data.content_html as string,
    signedAt: (data.signed_at as string) ?? null,
    signedByName: (data.signed_by_name as string) ?? null,
    status: data.status as string,
    createdAt: data.created_at as string,
  } satisfies ContractDocument;
}

export async function listContractDocuments(contractId: string) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sponsorship_contract_documents")
    .select("*")
    .eq("contract_id", contractId)
    .order("version", { ascending: false });

  return (data ?? []).map((d) => ({
    id: d.id as string,
    contractId: d.contract_id as string,
    version: d.version as number,
    title: d.title as string,
    contentHtml: d.content_html as string,
    signedAt: (d.signed_at as string) ?? null,
    signedByName: (d.signed_by_name as string) ?? null,
    status: d.status as string,
    createdAt: d.created_at as string,
  })) satisfies ContractDocument[];
}

export async function getContractDocument(documentId: string) {
  if (!isSupabaseConfigured()) return null;
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sponsorship_contract_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    contractId: data.contract_id as string,
    version: data.version as number,
    title: data.title as string,
    contentHtml: data.content_html as string,
    signedAt: (data.signed_at as string) ?? null,
    signedByName: (data.signed_by_name as string) ?? null,
    status: data.status as string,
    createdAt: data.created_at as string,
  } satisfies ContractDocument;
}
