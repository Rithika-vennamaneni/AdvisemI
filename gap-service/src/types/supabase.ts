export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      skills: {
        Row: {
          id: string;
          user_id: string;
          source: string;
          skill_name: string | null;
          score: number | null;
          evidence: string | null;
          created_at: string | null;
          run_id: string;
          expertise_level: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: string;
          skill_name?: string | null;
          score?: number | null;
          evidence?: string | null;
          created_at?: string | null;
          run_id: string;
          expertise_level?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          source?: string;
          skill_name?: string | null;
          score?: number | null;
          evidence?: string | null;
          created_at?: string | null;
          run_id?: string;
          expertise_level?: string | null;
        };
        Relationships: [];
      };
      gap_skills: {
        Row: {
          id: string;
          user_id: string;
          skill_name: string;
          priority: number;
          reason: string | null;
          created_at: string | null;
          run_id: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          skill_name: string;
          priority: number;
          reason?: string | null;
          created_at?: string | null;
          run_id: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          skill_name?: string;
          priority?: number;
          reason?: string | null;
          created_at?: string | null;
          run_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
