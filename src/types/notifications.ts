export type NotificationType =
  | "artist_live"
  | "tour_announced"
  | "new_merch"
  | "vip_event"
  | "friend_attending"
  | "ticket_reminder"
  | "price_drop"
  | "sold_out"
  | "follow"
  | "comment"
  | "system";

export type UserNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};
