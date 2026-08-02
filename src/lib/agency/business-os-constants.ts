export const COUNTDOWN_MILESTONES = [
  { label: "30 days before", days_before: 30 },
  { label: "14 days before", days_before: 14 },
  { label: "7 days before", days_before: 7 },
  { label: "3 days before", days_before: 3 },
  { label: "24 hours", days_before: 1 },
  { label: "Event day", days_before: 0 },
  { label: "Going live", days_before: -1 },
  { label: "Replay available", days_before: -2 },
] as const;

export const APPROVAL_STAGES = [
  "draft",
  "internal_review",
  "manager_approval",
  "agency_approval",
  "legal_approval",
  "ready_to_publish",
  "published",
] as const;

export type ApprovalStage = (typeof APPROVAL_STAGES)[number];
