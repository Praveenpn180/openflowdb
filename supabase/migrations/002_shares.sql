-- ============================================================
-- Migration 002: diagram_shares
-- Run AFTER 001_diagrams.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.diagram_shares (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id   uuid        NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
  share_token  text        UNIQUE NOT NULL
                           DEFAULT encode(gen_random_bytes(16), 'hex'),
  role         text        NOT NULL DEFAULT 'viewer'
                           CHECK (role IN ('viewer', 'editor')),
  label        text,                          -- optional friendly name
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.diagram_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can look up a share row by token (needed for public share links)
CREATE POLICY "shares: public read by token"
  ON public.diagram_shares
  FOR SELECT USING (true);

-- Only the diagram owner can create / delete shares
CREATE POLICY "shares: owner insert"
  ON public.diagram_shares
  FOR INSERT
  WITH CHECK (
    diagram_id IN (
      SELECT id FROM public.diagrams WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "shares: owner delete"
  ON public.diagram_shares
  FOR DELETE
  USING (
    diagram_id IN (
      SELECT id FROM public.diagrams WHERE owner_id = auth.uid()
    )
  );

-- ── Allow the shared diagram content to be read via share token ──────────────
-- Shared viewers/editors can read the parent diagram row
CREATE POLICY "diagrams: shared read via token"
  ON public.diagrams
  FOR SELECT
  USING (
    id IN (
      SELECT diagram_id FROM public.diagram_shares
    )
  );

-- Shared editors can update the diagram content
CREATE POLICY "diagrams: shared editor update"
  ON public.diagrams
  FOR UPDATE
  USING (
    id IN (
      SELECT diagram_id FROM public.diagram_shares WHERE role = 'editor'
    )
  );

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shares_diagram_id   ON public.diagram_shares(diagram_id);
CREATE INDEX IF NOT EXISTS idx_shares_share_token  ON public.diagram_shares(share_token);
