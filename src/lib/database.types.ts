// Auto-generated type helpers for Supabase tables.
// Regenerate with: npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

import type { Diagram } from "./erd/types";

export interface Database {
  public: {
    Tables: {
      diagrams: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          dialect: string;
          content: Diagram;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name?: string;
          dialect?: string;
          content?: Diagram;
        };
        Update: {
          name?: string;
          dialect?: string;
          content?: Diagram;
          updated_at?: string;
        };
      };
      diagram_shares: {
        Row: {
          id: string;
          diagram_id: string;
          share_token: string;
          role: "viewer" | "editor";
          label: string | null;
          created_at: string;
        };
        Insert: {
          diagram_id: string;
          role?: "viewer" | "editor";
          label?: string | null;
        };
        Update: {
          role?: "viewer" | "editor";
          label?: string | null;
        };
      };
      diagram_versions: {
        Row: {
          id: string;
          diagram_id: string;
          label: string | null;
          content: Diagram;
          created_at: string;
        };
        Insert: {
          diagram_id: string;
          label?: string | null;
          content: Diagram;
        };
        Update: {
          label?: string | null;
        };
      };
    };
  };
}
