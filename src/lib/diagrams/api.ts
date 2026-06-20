import { supabase } from "@/lib/supabase";
import type { Diagram } from "@/lib/erd/types";

// ── List ─────────────────────────────────────────────────────────────────────

export async function listDiagrams() {
  const { data, error } = await (supabase
    .from("diagrams") as any)
    .select("id, name, dialect, updated_at, created_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data as { id: string; name: string; dialect: string; updated_at: string; created_at: string }[];
}

// ── Get ──────────────────────────────────────────────────────────────────────

export async function getDiagram(id: string) {
  const { data, error } = await (supabase
    .from("diagrams") as any)
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as { id: string; name: string; dialect: string; content: Diagram; updated_at: string; created_at: string };
}

/** Look up a diagram via a share token (works without auth). */
export async function getDiagramByShareToken(token: string) {
  const { data: shareRow, error: shareError } = await (supabase
    .from("diagram_shares") as any)
    .select("diagram_id, role")
    .eq("share_token", token)
    .single();

  if (shareError) throw shareError;
  const row = shareRow as { diagram_id: string; role: string };

  const { data: diagram, error: diagError } = await (supabase
    .from("diagrams") as any)
    .select("*")
    .eq("id", row.diagram_id)
    .single();

  if (diagError) throw diagError;

  return { diagram: diagram as { id: string; name: string; dialect: string; content: Diagram }, role: row.role as "viewer" | "editor" };
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createDiagram(name: string, dialect: string, content: Diagram) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Must be signed in to create a diagram");

  const { data, error } = await (supabase
    .from("diagrams") as any)
    .insert({ name, dialect, content, owner_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as { id: string; name: string; dialect: string; content: Diagram };
}

// ── Save ─────────────────────────────────────────────────────────────────────

export async function saveDiagram(id: string, diagram: Diagram) {
  const { error } = await (supabase
    .from("diagrams") as any)
    .update({ name: diagram.name, dialect: diagram.dialect, content: diagram })
    .eq("id", id);

  if (error) throw error;
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deleteDiagram(id: string) {
  const { error } = await (supabase.from("diagrams") as any).delete().eq("id", id);
  if (error) throw error;
}

// ── Rename ───────────────────────────────────────────────────────────────────

export async function renameDiagram(id: string, name: string) {
  const { error } = await (supabase.from("diagrams") as any).update({ name }).eq("id", id);
  if (error) throw error;
}
