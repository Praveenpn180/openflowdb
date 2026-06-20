-- ============================================================
-- Migration 003: diagram_versions
-- Run AFTER 001_diagrams.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.diagram_versions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id  uuid        NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
  label       text,                          -- e.g. "v1.0 release", "before refactor"
  content     jsonb       NOT NULL,          -- full Diagram snapshot
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.diagram_versions ENABLE ROW LEVEL SECURITY;

-- Only owner can read / insert / delete their versions
CREATE POLICY "versions: owner full access"
  ON public.diagram_versions
  USING (
    diagram_id IN (
      SELECT id FROM public.diagrams WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    diagram_id IN (
      SELECT id FROM public.diagrams WHERE owner_id = auth.uid()
    )
  );

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_versions_diagram_id ON public.diagram_versions(diagram_id);
CREATE INDEX IF NOT EXISTS idx_versions_created_at ON public.diagram_versions(diagram_id, created_at DESC);
