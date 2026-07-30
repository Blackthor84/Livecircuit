import type {
  ProducerPermissionKey,
  ProducerPermissions,
  ProducerStaffRole,
} from "@/lib/production/types";

const ROLE_DEFAULTS: Record<ProducerStaffRole, ProducerPermissions> = {
  lead_producer: {
    delete_chat: true,
    mute_users: true,
    ban_users: true,
    pin_messages: true,
    start_stream: true,
    stop_stream: true,
    create_polls: true,
    giveaways: true,
    announcements: true,
    view_revenue: true,
    view_analytics: true,
    view_attendees: true,
    export_reports: true,
    slow_mode: true,
    approve_comments: true,
  },
  assistant_producer: {
    delete_chat: true,
    mute_users: true,
    ban_users: false,
    pin_messages: true,
    start_stream: false,
    stop_stream: false,
    create_polls: true,
    giveaways: false,
    announcements: true,
    view_revenue: false,
    view_analytics: true,
    view_attendees: true,
    export_reports: true,
    slow_mode: true,
    approve_comments: true,
  },
  moderator: {
    delete_chat: true,
    mute_users: true,
    ban_users: true,
    pin_messages: true,
    start_stream: false,
    stop_stream: false,
    create_polls: false,
    giveaways: false,
    announcements: false,
    view_revenue: false,
    view_analytics: true,
    view_attendees: true,
    export_reports: false,
    slow_mode: true,
    approve_comments: true,
  },
  sound_engineer: {
    delete_chat: false,
    mute_users: false,
    ban_users: false,
    pin_messages: false,
    start_stream: false,
    stop_stream: false,
    create_polls: false,
    giveaways: false,
    announcements: false,
    view_revenue: false,
    view_analytics: true,
    view_attendees: false,
    export_reports: true,
    slow_mode: false,
    approve_comments: false,
  },
  lighting_engineer: {
    delete_chat: false,
    mute_users: false,
    ban_users: false,
    pin_messages: false,
    start_stream: false,
    stop_stream: false,
    create_polls: false,
    giveaways: false,
    announcements: false,
    view_revenue: false,
    view_analytics: true,
    view_attendees: false,
    export_reports: true,
    slow_mode: false,
    approve_comments: false,
  },
};

export function resolveProducerPermissions(
  staffRole: ProducerStaffRole,
  overrides: ProducerPermissions = {}
): ProducerPermissions {
  return { ...ROLE_DEFAULTS[staffRole], ...overrides };
}

export function hasProducerPermission(
  permissions: ProducerPermissions,
  key: ProducerPermissionKey
): boolean {
  return permissions[key] === true;
}
