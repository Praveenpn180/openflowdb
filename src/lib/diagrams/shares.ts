import { supabase } from "@/lib/supabase";

export type ShareRole = "viewer" | "editor";

export interface ShareRow {
  id: string;
  diagram_id: string;
  share_token: string;
  role: ShareRole;
  label: string | null;
  created_at: string;
}

// ── List ─────────────────────────────────────────────────────────────────────

export async function listShares(diagramId: string): Promise<ShareRow[]> {
  const { data, error } = await (supabase
    .from("diagram_shares") as any)
    .select("*")
    .eq("diagram_id", diagramId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as ShareRow[];
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createShare(
  diagramId: string,
  role: ShareRole,
  label?: string,
): Promise<ShareRow> {
  const { data, error } = await (supabase
    .from("diagram_shares") as any)
    .insert({ diagram_id: diagramId, role, label: label ?? null })
    .select()
    .single();

  if (error) throw error;
  return data as ShareRow;
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteShare(shareId: string) {
  const { error } = await (supabase.from("diagram_shares") as any).delete().eq("id", shareId);
  if (error) throw error;
}

// ── Build share URL ───────────────────────────────────────────────────────────

export function buildShareUrl(token: string): string {
  const base = (import.meta.env.VITE_APP_URL as string) ?? window.location.origin;
  return `${base}/editor?share=${token}`;
}
