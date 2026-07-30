import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import { FOUNDING_PARTNER_BENEFITS } from "@/lib/sponsorship/program-constants";

export type FoundingPartnerProgramStats = {
  maxSlots: number;
  approvedCount: number;
  remainingSlots: number;
  pendingApplications: number;
  totalRevenueCents: number;
  programActive: boolean;
  benefits: readonly string[];
};

export type FoundingPartnerApplication = {
  id: string;
  organizationName: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  companyWebsite: string | null;
  message: string | null;
  status: string;
  createdAt: string;
};

export type FoundingPartner = {
  id: string;
  organizationId: string;
  displayName: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  approvedAt: string;
  totalRevenueCents: number;
};

export async function getFoundingPartnerProgramStats(): Promise<FoundingPartnerProgramStats> {
  const empty: FoundingPartnerProgramStats = {
    maxSlots: 50,
    approvedCount: 0,
    remainingSlots: 50,
    pendingApplications: 0,
    totalRevenueCents: 0,
    programActive: true,
    benefits: FOUNDING_PARTNER_BENEFITS,
  };
  if (!isSupabaseConfigured()) return empty;

  const admin = getSupabaseAdmin();
  const [settings, partners, pending] = await Promise.all([
    admin.from("founding_partner_program_settings").select("*").eq("id", true).maybeSingle(),
    admin.from("founding_partners").select("total_revenue_cents"),
    admin
      .from("founding_partner_applications")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "reviewing"]),
  ]);

  const maxSlots = (settings.data?.max_slots as number) ?? 50;
  const approvedCount = partners.data?.length ?? 0;
  const totalRevenueCents = (partners.data ?? []).reduce(
    (s, p) => s + ((p.total_revenue_cents as number) ?? 0),
    0
  );

  return {
    maxSlots,
    approvedCount,
    remainingSlots: Math.max(0, maxSlots - approvedCount),
    pendingApplications: pending.count ?? 0,
    totalRevenueCents,
    programActive: settings.data?.program_active !== false,
    benefits: FOUNDING_PARTNER_BENEFITS,
  };
}

export async function listFoundingPartnerApplications(limit = 100) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("founding_partner_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    organizationName: r.organization_name as string,
    contactName: (r.contact_name as string) ?? null,
    contactEmail: r.contact_email as string,
    contactPhone: (r.contact_phone as string) ?? null,
    companyWebsite: (r.company_website as string) ?? null,
    message: (r.message as string) ?? null,
    status: r.status as string,
    createdAt: r.created_at as string,
  })) satisfies FoundingPartnerApplication[];
}

export async function listFoundingPartnersPublic() {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("founding_partners")
    .select("*")
    .eq("show_on_partners_page", true)
    .order("approved_at", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id as string,
    organizationId: r.organization_id as string,
    displayName: r.display_name as string,
    logoUrl: (r.logo_url as string) ?? null,
    websiteUrl: (r.website_url as string) ?? null,
    approvedAt: r.approved_at as string,
    totalRevenueCents: r.total_revenue_cents as number,
  })) satisfies FoundingPartner[];
}

export async function updateFoundingPartnerMaxSlots(maxSlots: number) {
  if (!isSupabaseConfigured()) return false;
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("founding_partner_program_settings")
    .update({ max_slots: maxSlots })
    .eq("id", true);
  return !error;
}

export async function isFoundingPartner(organizationId: string) {
  if (!isSupabaseConfigured()) return false;
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("founding_partners")
    .select("id")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return Boolean(data);
}
