/** Minimal Database typing until `supabase gen types` is wired in CI. */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
};

export interface Database {
  public: {
    Tables: {
      orders: GenericTable;
      tickets: GenericTable;
      profiles: GenericTable;
      artists: GenericTable;
      tours: GenericTable;
      tour_stops: GenericTable;
      events: GenericTable;
      products: GenericTable;
      notifications: GenericTable;
      chat_messages: GenericTable;
      reactions: GenericTable;
    };
    Views: {
      artist_fan_locations: { Row: Record<string, unknown> };
    };
  };
}
