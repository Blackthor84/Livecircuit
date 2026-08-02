/** Client-safe sponsor pricing bundle — serialized from DB snapshot on the server. */
export type SponsorPricingBundle = {
  founderPricing: Record<string, { annual: number; monthly: number; regularAnnual: number }>;
  founderProgram: {
    badge: string;
    headline: string;
    subheadline: string;
    sectionTitle: string;
    timerTitle: string;
    timerSubtitle: string;
    timerMessage: string;
    legalNote: string;
  };
  futureGrowth: Partial<Record<string, number>>;
  futureEnterprise: Partial<Record<string, string>>;
  setupFees: Partial<Record<string, number>>;
  sponsorComparison?: Array<{ tier: string; founder: string; regular: string; savings: string }>;
  loadedAt: string;
};
