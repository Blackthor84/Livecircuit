export type ProducerStaffRole =
  | "lead_producer"
  | "assistant_producer"
  | "moderator"
  | "sound_engineer"
  | "lighting_engineer";

export type ProducerLabel =
  | "manager"
  | "band_member"
  | "friend"
  | "family_member"
  | "tour_manager"
  | "moderator"
  | "sound_engineer"
  | "lighting_operator"
  | "custom";

export type ProducerPermissionKey =
  | "delete_chat"
  | "mute_users"
  | "ban_users"
  | "pin_messages"
  | "start_stream"
  | "stop_stream"
  | "pause_stream"
  | "create_polls"
  | "giveaways"
  | "announcements"
  | "view_revenue"
  | "view_analytics"
  | "view_attendees"
  | "view_ticket_sales"
  | "export_reports"
  | "slow_mode"
  | "approve_comments"
  | "manage_queue"
  | "mute_chat"
  | "timeout_users";

export type ProducerPermissions = Partial<Record<ProducerPermissionKey, boolean>>;

export type ProducerChecklistKey =
  | "audio_approved"
  | "video_approved"
  | "lighting_approved"
  | "internet_stable"
  | "camera_positioned"
  | "background_approved"
  | "stream_ready";

export type ProducerChecklist = Partial<Record<ProducerChecklistKey, boolean>>;

export type ProducerPreviewMode =
  | "fan"
  | "artist"
  | "backstage"
  | "moderator"
  | "mobile_fan"
  | "desktop_fan";

export type ProductionAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: number;
};

export const PRODUCER_LABEL_OPTIONS: { value: ProducerLabel; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "band_member", label: "Band Member" },
  { value: "friend", label: "Friend" },
  { value: "family_member", label: "Family Member" },
  { value: "tour_manager", label: "Tour Manager" },
  { value: "moderator", label: "Moderator" },
  { value: "sound_engineer", label: "Sound Engineer" },
  { value: "lighting_operator", label: "Lighting Operator" },
  { value: "custom", label: "Custom Producer" },
];

export const PRODUCER_STAFF_ROLES: { value: ProducerStaffRole; label: string }[] = [
  { value: "lead_producer", label: "Lead Producer" },
  { value: "assistant_producer", label: "Assistant Producer" },
  { value: "moderator", label: "Moderator" },
  { value: "sound_engineer", label: "Sound Engineer" },
  { value: "lighting_engineer", label: "Lighting Engineer" },
];

export const PRODUCER_CHECKLIST_ITEMS: { key: ProducerChecklistKey; label: string }[] = [
  { key: "audio_approved", label: "Audio approved" },
  { key: "video_approved", label: "Video approved" },
  { key: "lighting_approved", label: "Lighting approved" },
  { key: "internet_stable", label: "Internet stable" },
  { key: "camera_positioned", label: "Camera positioned" },
  { key: "background_approved", label: "Background approved" },
  { key: "stream_ready", label: "Stream ready" },
];

export const ALL_PRODUCER_PERMISSIONS: { key: ProducerPermissionKey; label: string }[] = [
  { key: "start_stream", label: "Start stream" },
  { key: "stop_stream", label: "Stop stream" },
  { key: "pause_stream", label: "Pause stream" },
  { key: "mute_chat", label: "Mute chat (slow mode)" },
  { key: "delete_chat", label: "Delete messages" },
  { key: "timeout_users", label: "Timeout users" },
  { key: "mute_users", label: "Mute users" },
  { key: "ban_users", label: "Ban users" },
  { key: "pin_messages", label: "Pin messages" },
  { key: "create_polls", label: "Create polls" },
  { key: "giveaways", label: "Launch giveaways" },
  { key: "announcements", label: "Post announcements" },
  { key: "manage_queue", label: "Manage queue" },
  { key: "view_analytics", label: "View analytics" },
  { key: "view_revenue", label: "View revenue" },
  { key: "view_attendees", label: "View attendees" },
  { key: "view_ticket_sales", label: "View ticket sales" },
  { key: "export_reports", label: "Export reports" },
  { key: "slow_mode", label: "Slow mode" },
  { key: "approve_comments", label: "Approve featured comments" },
];
