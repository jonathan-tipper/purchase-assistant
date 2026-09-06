export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
type DecisionRow = {
  id: string;
  user_id: string;
  payload: Json;
  revision: number;
  updated_at: string;
};
export type Database = {
  public: {
    Tables: {
      pa_decisions: {
        Row: DecisionRow;
        Insert: {
          id: string;
          user_id: string;
          payload: Json;
          revision?: number;
          updated_at?: string;
        };
        Update: { payload?: Json; revision?: number; updated_at?: string };
        Relationships: [];
      };
      pa_purchase_items: {
        Row: {
          id: string;
          name: string;
          price: number;
          lifespan_years: number;
          uses_per_week: number;
          minutes_per_use: number;
          depreciation_rate_percent: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      pa_purchase_journal: {
        Row: {
          id: string;
          name: string;
          actual_price: number;
          purchase_date: string;
          satisfaction_score: number | null;
          actual_uses_per_week: number | null;
          would_buy_again: boolean | null;
          notes: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
