/** US state positions for sponsor inventory map (percent-based layout). */
export const US_STATE_MAP_POSITIONS: Record<string, { x: number; y: number; abbr: string }> = {
  Alabama: { x: 72, y: 68, abbr: "AL" }, Alaska: { x: 12, y: 82, abbr: "AK" },
  Arizona: { x: 22, y: 58, abbr: "AZ" }, Arkansas: { x: 62, y: 62, abbr: "AR" },
  California: { x: 8, y: 48, abbr: "CA" }, Colorado: { x: 38, y: 46, abbr: "CO" },
  Connecticut: { x: 88, y: 32, abbr: "CT" }, Delaware: { x: 86, y: 40, abbr: "DE" },
  Florida: { x: 78, y: 78, abbr: "FL" }, Georgia: { x: 74, y: 64, abbr: "GA" },
  Hawaii: { x: 28, y: 82, abbr: "HI" }, Idaho: { x: 22, y: 28, abbr: "ID" },
  Illinois: { x: 68, y: 44, abbr: "IL" }, Indiana: { x: 72, y: 42, abbr: "IN" },
  Iowa: { x: 58, y: 38, abbr: "IA" }, Kansas: { x: 52, y: 50, abbr: "KS" },
  Kentucky: { x: 72, y: 50, abbr: "KY" }, Louisiana: { x: 62, y: 72, abbr: "LA" },
  Maine: { x: 92, y: 22, abbr: "ME" }, Maryland: { x: 84, y: 42, abbr: "MD" },
  Massachusetts: { x: 90, y: 30, abbr: "MA" }, Michigan: { x: 72, y: 32, abbr: "MI" },
  Minnesota: { x: 56, y: 24, abbr: "MN" }, Mississippi: { x: 66, y: 68, abbr: "MS" },
  Missouri: { x: 60, y: 50, abbr: "MO" }, Montana: { x: 32, y: 22, abbr: "MT" },
  Nebraska: { x: 48, y: 40, abbr: "NE" }, Nevada: { x: 16, y: 42, abbr: "NV" },
  "New Hampshire": { x: 90, y: 26, abbr: "NH" }, "New Jersey": { x: 86, y: 36, abbr: "NJ" },
  "New Mexico": { x: 34, y: 58, abbr: "NM" }, "New York": { x: 84, y: 30, abbr: "NY" },
  "North Carolina": { x: 80, y: 56, abbr: "NC" }, "North Dakota": { x: 48, y: 20, abbr: "ND" },
  Ohio: { x: 76, y: 40, abbr: "OH" }, Oklahoma: { x: 52, y: 58, abbr: "OK" },
  Oregon: { x: 10, y: 26, abbr: "OR" }, Pennsylvania: { x: 82, y: 38, abbr: "PA" },
  "Rhode Island": { x: 91, y: 32, abbr: "RI" }, "South Carolina": { x: 78, y: 60, abbr: "SC" },
  "South Dakota": { x: 48, y: 30, abbr: "SD" }, Tennessee: { x: 70, y: 56, abbr: "TN" },
  Texas: { x: 48, y: 68, abbr: "TX" }, Utah: { x: 28, y: 44, abbr: "UT" },
  Vermont: { x: 88, y: 24, abbr: "VT" }, Virginia: { x: 80, y: 48, abbr: "VA" },
  Washington: { x: 12, y: 18, abbr: "WA" }, "West Virginia": { x: 78, y: 46, abbr: "WV" },
  Wisconsin: { x: 64, y: 28, abbr: "WI" }, Wyoming: { x: 36, y: 34, abbr: "WY" },
};

export const ABBR_TO_STATE_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATE_MAP_POSITIONS).map(([name, v]) => [v.abbr, name])
);

export const FOUNDING_PARTNER_BENEFITS = [
  "Founding Partner Badge",
  "Permanent recognition on LiveCircuit",
  "Early access to new sponsorship inventory",
  "First Right of Renewal",
  "Preferred pricing on future sponsorships",
  "Invitations to LiveCircuit events",
  "Annual sponsor summit",
  "Priority customer support",
  "Featured on the LiveCircuit Partners page",
] as const;

export const FIRST_RIGHT_RENEWAL_DAYS = [30, 60, 90, 180] as const;

export const PIPELINE_STAGES = [
  { id: "lead", label: "Lead" },
  { id: "contacted", label: "Contacted" },
  { id: "meeting_scheduled", label: "Meeting Scheduled" },
  { id: "proposal_sent", label: "Proposal Sent" },
  { id: "negotiating", label: "Negotiating" },
  { id: "contract_review", label: "Contract Review" },
  { id: "approved", label: "Approved" },
  { id: "signed", label: "Signed" },
  { id: "active", label: "Active" },
  { id: "renewal", label: "Renewal" },
  { id: "expired", label: "Expired" },
  { id: "lost", label: "Lost Opportunity" },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]["id"];
