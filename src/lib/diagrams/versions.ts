import { supabase } from "@/lib/supabase";
import type { Diagram } from "@/lib/erd/types";

type VersionRow = { id: string; diagram_id: string; label: string | null; content: Diagram; created_at: string };
type VersionMeta = { id: string; label: string | null; created_at: string };

// ── List ─────────────────────────────────────────────────────────────────────

export async function listVersions(diagramId: string): Promise<VersionMeta[]> {
  const { data, error } = await (supabase
    .from("diagram_versions") as any)
    .select("id, label, created_at")
    .eq("diagram_id", diagramId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as VersionMeta[];
}

// ── Save checkpoint ───────────────────────────────────────────────────────────

export async function saveVersion(diagramId: string, content: Diagram, label?: string): Promise<VersionMeta> {
  const { data, error } = await (supabase
    .from("diagram_versions") as any)
    .insert({ diagram_id: diagramId, content, label: label ?? null })
    .select()
    .single();

  if (error) throw error;
  return data as VersionMeta;
}

// ── Get full content ─────────────────────────────────────────────────────────

export async function getVersion(versionId: string): Promise<VersionRow> {
  const { data, error } = await (supabase
    .from("diagram_versions") as any)
    .select("*")
    .eq("id", versionId)
    .single();

  if (error) throw error;
  return data as VersionRow;
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteVersion(versionId: string) {
  const { error } = await (supabase
    .from("diagram_versions") as any)
    .delete()
    .eq("id", versionId);

  if (error) throw error;
}

// ── Rename label ──────────────────────────────────────────────────────────────

export async function renameVersion(versionId: string, label: string) {
  const { error } = await (supabase
    .from("diagram_versions") as any)
    .update({ label })
    .eq("id", versionId);

  if (error) throw error;
}
