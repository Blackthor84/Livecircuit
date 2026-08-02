export const CRM_PIPELINE_STAGES = [
  { id: "new_inquiry", label: "New Inquiry", color: "bg-slate-500/20 text-slate-300" },
  { id: "contacted", label: "Contacted", color: "bg-blue-500/20 text-blue-300" },
  { id: "discovery_call", label: "Discovery Call", color: "bg-cyan-500/20 text-cyan-300" },
  { id: "proposal_sent", label: "Proposal Sent", color: "bg-indigo-500/20 text-indigo-300" },
  { id: "negotiation", label: "Negotiation", color: "bg-violet-500/20 text-violet-300" },
  { id: "contract_sent", label: "Contract Sent", color: "bg-purple-500/20 text-purple-300" },
  { id: "contract_signed", label: "Contract Signed", color: "bg-fuchsia-500/20 text-fuchsia-300" },
  { id: "event_scheduled", label: "Event Scheduled", color: "bg-pink-500/20 text-pink-300" },
  { id: "marketing", label: "Marketing", color: "bg-rose-500/20 text-rose-300" },
  { id: "tickets_on_sale", label: "Tickets On Sale", color: "bg-orange-500/20 text-orange-300" },
  { id: "live_event", label: "Live Event", color: "bg-red-500/20 text-red-300" },
  { id: "completed", label: "Completed", color: "bg-emerald-500/20 text-emerald-300" },
  { id: "cancelled", label: "Cancelled", color: "bg-zinc-500/20 text-zinc-400" },
] as const;

export type CrmPipelineStageId = (typeof CRM_PIPELINE_STAGES)[number]["id"];

export const CRM_CONTACT_TYPES = [
  { id: "brand", label: "Brand" },
  { id: "sponsor", label: "Sponsor" },
  { id: "manager", label: "Manager" },
  { id: "artist", label: "Artist" },
  { id: "venue", label: "Venue" },
  { id: "media", label: "Media" },
  { id: "influencer", label: "Influencer" },
  { id: "talent_buyer", label: "Talent Buyer" },
  { id: "other", label: "Other" },
] as const;

export type CrmContactTypeId = (typeof CRM_CONTACT_TYPES)[number]["id"];

export const CRM_EVENT_TYPES = [
  { id: "virtual_concert", label: "Virtual Concert" },
  { id: "festival", label: "Festival" },
  { id: "private_event", label: "Private Event" },
  { id: "corporate", label: "Corporate" },
  { id: "charity", label: "Charity" },
  { id: "album_release", label: "Album Release" },
  { id: "tour_stop", label: "Tour Stop" },
  { id: "other", label: "Other" },
] as const;

export const CRM_TASK_PRIORITIES = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
] as const;

export const CRM_TASK_STATUSES = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export const CRM_MARKETING_CHECKLIST = [
  { key: "graphics", label: "Graphics" },
  { key: "social_posts", label: "Social Posts" },
  { key: "email_campaign", label: "Email Campaign" },
  { key: "sms_campaign", label: "SMS Campaign" },
  { key: "press_release", label: "Press Release" },
  { key: "sponsor_posts", label: "Sponsor Posts" },
  { key: "artist_posts", label: "Artist Posts" },
  { key: "countdown_posts", label: "Countdown Posts" },
  { key: "ticket_launch", label: "Ticket Launch" },
  { key: "reminder_campaign", label: "Reminder Campaign" },
] as const;

export const CRM_PERFORMANCE_CHECKLIST = [
  { key: "tech_rider", label: "Tech Rider Confirmed" },
  { key: "sound_check", label: "Sound Check Scheduled" },
  { key: "stream_test", label: "Stream Test Complete" },
  { key: "venue_briefing", label: "Venue Briefing" },
  { key: "artist_briefing", label: "Artist Briefing" },
  { key: "sponsor_assets", label: "Sponsor Assets Loaded" },
  { key: "recording_setup", label: "Recording Setup" },
  { key: "replay_configured", label: "Replay Configured" },
] as const;

export const CRM_PAYMENT_TYPES = [
  { id: "deposit", label: "Deposit" },
  { id: "balance", label: "Balance" },
  { id: "refund", label: "Refund" },
  { id: "payout", label: "Payout" },
  { id: "invoice", label: "Invoice" },
  { id: "ticket_revenue", label: "Ticket Revenue" },
] as const;

export const CRM_CONTRACT_STATUSES = [
  { id: "draft", label: "Draft" },
  { id: "pending_approval", label: "Pending Approval" },
  { id: "approved", label: "Approved" },
  { id: "sent", label: "Sent" },
  { id: "signed", label: "Signed" },
  { id: "expired", label: "Expired" },
  { id: "void", label: "Void" },
] as const;

export function crmStageLabel(stage: string): string {
  return CRM_PIPELINE_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

export function crmContactTypeLabel(type: string): string {
  return CRM_CONTACT_TYPES.find((t) => t.id === type)?.label ?? type;
}
