import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import {
  AdminHolidayRulesPanel,
  AdminRulesList,
} from "@/components/admin/business-rules/admin-business-rules-panels";
import { categoryLabel } from "@/components/admin/business-rules/business-rules-sub-nav";
import { getBusinessRulesOverview } from "@/lib/data/business-rules-admin";
import { CATEGORY_LABELS, type BusinessRuleCategory } from "@/lib/business-rules/types";

const SLUG_TO_CATEGORY: Record<string, BusinessRuleCategory> = {
  venue: "venue",
  pricing: "pricing",
  subscription: "subscription",
  agency: "agency",
  artist: "artist",
  sponsor: "sponsor",
  discount: "discount",
  promotion: "promotion",
  ticket: "ticket",
  "feature-access": "feature_access",
  automation: "automation",
  holiday: "holiday",
  regional: "regional",
  experimental: "experimental",
};

export async function generateStaticParams() {
  return Object.keys(SLUG_TO_CATEGORY).map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = SLUG_TO_CATEGORY[category];
  return { title: `${cat ? CATEGORY_LABELS[cat] : "Rules"} — Admin` };
}

export default async function AdminBusinessRulesCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = SLUG_TO_CATEGORY[slug];
  if (!category) notFound();

  const overview = await getBusinessRulesOverview();
  const rules = overview.rules.filter((r) => r.category === category);

  return (
    <>
      <AdminPageHeader
        title={categoryLabel(category)}
        subtitle={`Manage ${categoryLabel(category).toLowerCase()} — conditions, actions, priority, and scheduling.`}
      />
      <AdminRulesList rules={rules} category={category} title={`${rules.length} Rules`} />
      {category === "holiday" ? (
        <div className="mt-8">
          <AdminHolidayRulesPanel holidays={overview.holidays} />
        </div>
      ) : null}
    </>
  );
}
