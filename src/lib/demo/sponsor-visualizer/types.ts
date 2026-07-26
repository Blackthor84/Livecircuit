/**
 * Sponsor Visualizer domain types — modular for future CRM / inventory integration.
 */

export type SponsorVisualizerPhase = "intro" | "configurator";

export type TimeOfDay = "day" | "night";

export type SponsorVisualizerFormState = {
  companyName: string;
  industry: string;
  website: string;
  slogan: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  state: string;
  tierId: string;
  monthlyBudget: number;
  contractYears: number;
  timeOfDay: TimeOfDay;
  eventType: string;
  expectedAttendance: number;
};

export type StateMarketSnapshot = {
  state: string;
  venues: number;
  population: number;
  annualVisitors: number;
  sponsorshipOpportunities: number;
  economicRegion: string;
};

export type VenueTierSnapshot = {
  id: string;
  name: string;
  capacity: number;
  eventsPerYear: number;
  visitors: number;
  brandExposure: number;
  investmentMin: number;
  investmentMax: number;
  availability: string;
};

/** Future: replace demo adapters with CRM / inventory API clients. */
export type SponsorVisualizerDataAdapter = {
  getStateMarket: (state: string) => StateMarketSnapshot;
  getVenueTiers: () => VenueTierSnapshot[];
  generateProposal: (form: SponsorVisualizerFormState) => unknown;
};
