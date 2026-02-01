export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      runs: {
        Row: {
          id: string;
          user_id: string;
          dream_role: string | null;
          term: string | null;
          status: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          dream_role?: string | null;
          term?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          dream_role?: string | null;
          term?: string | null;
          status?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          raw_text: string | null;
          created_at: string | null;
          run_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          raw_text?: string | null;
          created_at?: string | null;
          run_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          raw_text?: string | null;
          created_at?: string | null;
          run_id?: string | null;
        };
        Relationships: [];
      };
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
          dream_role: string | null;
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
          dream_role?: string | null;
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
          dream_role?: string | null;
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
