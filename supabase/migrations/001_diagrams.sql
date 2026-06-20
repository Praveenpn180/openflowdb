-- ============================================================
-- Migration 001: diagrams
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Extension required for gen_random_uuid() and gen_random_bytes()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── diagrams ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diagrams (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL DEFAULT 'Untitled Schema',
  dialect     text        NOT NULL DEFAULT 'postgres'
                          CHECK (dialect IN ('postgres', 'mysql', 'sqlite')),
  content     jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER diagrams_updated_at
  BEFORE UPDATE ON public.diagrams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.diagrams ENABLE ROW LEVEL SECURITY;

-- Owners can do everything to their own diagrams
CREATE POLICY "diagrams: owner full access"
  ON public.diagrams
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_diagrams_owner_id ON public.diagrams(owner_id);
