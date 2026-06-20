import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
  Database,
  Plus,
  Table2,
  Trash2,
  Sparkles,
  Eraser,
  Network,
  PanelRight,
  Code2,
  Undo2,
  Redo2,
  Terminal,
  Save,
  LogIn,
  History,
  EyeOff,
  CloudOff,
  Loader2,
  LayoutDashboard,
} from "lucide-react";
import { Canvas, type CanvasHandle } from "@/components/erd/Canvas";
import { DiagramFileMenu } from "@/components/erd/DiagramFileMenu";
import { GitHubIcon } from "@/components/icons/github-icon";
import { Inspector } from "@/components/erd/Inspector";
import { SqlPanel } from "@/components/erd/SqlPanel";
import { ImportSqlDialog } from "@/components/erd/ImportSqlDialog";
import { CommandPalette } from "@/components/erd/CommandPalette";
import { ShareDialog } from "@/components/erd/ShareDialog";
import { VersionHistoryPanel } from "@/components/erd/VersionHistoryPanel";
import {
  actions,
  hydrate,
  useCanRedo,
  useCanUndo,
  useDiagram,
  useSelectedTableId,
  useSelectedTableIds,
} from "@/lib/erd/store";
import { validateDiagram, diagramIssueSummary } from "@/lib/erd/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { GITHUB_REPO_URL } from "@/lib/site";
import { useAuth } from "@/lib/auth/useAuth";
import { getDiagram, saveDiagram, getDiagramByShareToken } from "@/lib/diagrams/api";
import { toast } from "sonner";
import { isSupabaseConfigured } from "@/lib/supabase";

// ── Search param schema ───────────────────────────────────────────────────────

const searchSchema = z.object({
  id: z.string().optional(),
  share: z.string().optional(),
});

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Editor — OpenFlowDB" },
      {
        name: "description",
        content: "Design database schemas visually and generate SQL with OpenFlowDB.",
      },
    ],
  }),
  validateSearch: (search) => searchSchema.parse(search),
  component: EditorPage,
});

type SideTab = "properties" | "sql" | "history";

// Auto-save debounce in ms
const AUTO_SAVE_MS = 2000;

function EditorPage() {
  const { id: diagramId, share: shareToken } = Route.useSearch();
  const diagram = useDiagram();
  const selectedId = useSelectedTableId();
  const selectedIds = useSelectedTableIds();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const canvasRef = useRef<CanvasHandle>(null);
  const [tab, setTab] = useState<SideTab>("properties");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const [cloudLoading, setCloudLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [readOnly, setReadOnly] = useState(false);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDiagramRef = useRef<string | null>(null);

  // Validation summary
  const issues = validateDiagram(diagram);
  const { errors: issueErrors, warnings: issueWarnings } = diagramIssueSummary(issues);

  // ── Load diagram from cloud ──────────────────────────────────────────────────

  useEffect(() => {
    if (shareToken && isSupabaseConfigured()) {
      setCloudLoading(true);
      getDiagramByShareToken(shareToken)
        .then(({ diagram: d, role }) => {
          actions.importDiagram(d.content);
          if (role === "viewer") setReadOnly(true);
        })
        .catch(() => {
          toast.error("Share link not found or expired");
        })
        .finally(() => setCloudLoading(false));
      return;
    }

    if (diagramId && isSupabaseConfigured()) {
      setCloudLoading(true);
      getDiagram(diagramId)
        .then((d) => {
          actions.importDiagram(d.content);
        })
        .catch(() => {
          toast.error("Could not load diagram from cloud");
          hydrate(); // fall back to localStorage
        })
        .finally(() => setCloudLoading(false));
      return;
    }

    // No cloud id — use localStorage
    hydrate();
  }, [diagramId, shareToken]);

  // ── Auto-save ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!diagramId || !user || readOnly || !isSupabaseConfigured()) return;

    const serialized = JSON.stringify(diagram);
    if (serialized === lastSavedDiagramRef.current) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        setSaving(true);
        await saveDiagram(diagramId, diagram);
        lastSavedDiagramRef.current = serialized;
      } catch {
        // Silently fail auto-save; user can manually save
      } finally {
        setSaving(false);
      }
    }, AUTO_SAVE_MS);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [diagram, diagramId, user, readOnly]);

  // ── Manual save ───────────────────────────────────────────────────────────────

  async function handleManualSave() {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!diagramId || !isSupabaseConfigured()) {
      toast.error("No cloud diagram loaded. Open from your dashboard to save.");
      return;
    }
    setSaving(true);
    try {
      await saveDiagram(diagramId, diagram);
      lastSavedDiagramRef.current = JSON.stringify(diagram);
      toast.success("Diagram saved");
    } catch {
      toast.error("Failed to save to cloud");
    } finally {
      setSaving(false);
    }
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const tag = (e.target as HTMLElement).tagName;
      const isEditing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (mod && e.key === "k") { e.preventDefault(); setPaletteOpen((o) => !o); return; }

      if (mod && !e.shiftKey && e.key === "z") { e.preventDefault(); actions.undo(); return; }
      if (mod && e.shiftKey && e.key === "z") { e.preventDefault(); actions.redo(); return; }
      if (mod && e.key === "y") { e.preventDefault(); actions.redo(); return; }

      if (mod && e.key === "s") { e.preventDefault(); handleManualSave(); return; }

      if (isEditing) return;

      if (mod && e.key === "t") { e.preventDefault(); actions.addTable(); return; }
      if (mod && e.key === "l") { e.preventDefault(); actions.autoLayout(); return; }
      if (mod && e.key === "0") { e.preventDefault(); canvasRef.current?.fitView(); return; }
      if (mod && e.key === "g") { e.preventDefault(); setTab("sql"); return; }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.size > 1) { e.preventDefault(); actions.bulkDeleteTables([...selectedIds]); }
        else if (selectedId) { e.preventDefault(); actions.removeTable(selectedId); }
        return;
      }
      if (e.key === "Escape") { actions.selectTable(null); return; }
    },
    [selectedId, selectedIds],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Loading state ─────────────────────────────────────────────────────────────

  if (cloudLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading diagram…</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="dark flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* ---- top bar ---- */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Database className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold tracking-tight">OpenFlowDB</span>
          </Link>
          <div className="mx-1 h-5 w-px bg-border" />
          <Input
            value={diagram.name}
            onChange={(e) => !readOnly && actions.renameDiagram(e.target.value)}
            readOnly={readOnly}
            className="h-8 w-56 border-transparent bg-transparent font-medium hover:border-input focus:border-input"
          />
          {/* Save status indicator */}
          {diagramId && isSupabaseConfigured() && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {saving ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>
              ) : (
                <><Save className="h-3 w-3 text-emerald-500" /> Saved</>
              )}
            </span>
          )}
          {/* Read-only badge */}
          {readOnly && (
            <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
              <EyeOff className="h-2.5 w-2.5" /> Read-only
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Undo / Redo */}
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => actions.undo()} disabled={!canUndo || readOnly} title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => actions.redo()} disabled={!canRedo || readOnly} title="Redo (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-5 w-px bg-border" />

          <DiagramFileMenu
            canvasRef={canvasRef}
            onImportSql={() => setImportOpen(true)}
            readOnly={readOnly}
          />

          {/* Share button (only if cloud diagram) */}
          {diagramId && user && !readOnly && isSupabaseConfigured() && (
            <ShareDialog diagramId={diagramId} />
          )}

          {/* Save / Login */}
          {!readOnly && isSupabaseConfigured() && (
            user ? (
              <Button size="sm" variant="outline" onClick={handleManualSave} disabled={saving} className="gap-1.5 cursor-pointer">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </Button>
            ) : (
              <Button size="sm" variant="outline" asChild className="gap-1.5 cursor-pointer">
                <Link to="/login">
                  <LogIn className="h-3.5 w-3.5" /> Sign in to save
                </Link>
              </Button>
            )
          )}

          {/* Supabase not configured indicator */}
          {!isSupabaseConfigured() && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Configure VITE_SUPABASE_URL to enable cloud features">
              <CloudOff className="h-3.5 w-3.5" /> Local only
            </span>
          )}

          <div className="mx-1 h-5 w-px bg-border" />

          {/* Dashboard link */}
          {user && (
            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" asChild title="My Diagrams">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
              </Link>
            </Button>
          )}

          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center rounded-md px-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="View on GitHub"
          >
            <GitHubIcon className="h-4 w-4" />
          </a>

          <div className="mx-1 h-5 w-px bg-border" />

          <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground cursor-pointer" onClick={() => setPaletteOpen(true)} title="Command palette (Ctrl+K)">
            <Terminal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Commands</span>
            <kbd className="hidden rounded border bg-muted px-1 text-[10px] font-mono sm:inline">⌘K</kbd>
          </Button>

          <Button size="sm" onClick={() => setTab("sql")} title="Ctrl+G">
            <Code2 className="mr-1 h-3.5 w-3.5" /> Generate SQL
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ---- left: tables list ---- */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tables
              {(issueErrors > 0 || issueWarnings > 0) && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                    issueErrors > 0 ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-500",
                  )}
                  title={`${issueErrors} error${issueErrors !== 1 ? "s" : ""}, ${issueWarnings} warning${issueWarnings !== 1 ? "s" : ""}`}
                >
                  {issueErrors > 0 ? issueErrors : issueWarnings}
                </span>
              )}
            </h2>
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              onClick={() => !readOnly && actions.addTable()}
              disabled={readOnly}
              title="Add table (Ctrl+T)"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
            {diagram.tables.length === 0 && (
              <p className="px-2 py-4 text-xs text-muted-foreground">
                No tables yet. Click + to add one.
              </p>
            )}
            {diagram.tables.map((t) => {
              const tableIssues = issues.get(t.id) ?? [];
              const hasError = tableIssues.some((i) => i.severity === "error");
              const hasWarning = tableIssues.some((i) => i.severity === "warning");
              const isMultiSelected = selectedIds.has(t.id);

              return (
                <button
                  key={t.id}
                  onClick={() => { actions.selectTable(t.id); setTab("properties"); }}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
                    t.id === selectedId
                      ? "bg-accent text-accent-foreground"
                      : isMultiSelected
                        ? "bg-accent/50 text-accent-foreground"
                        : "hover:bg-muted",
                  )}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.color }} />
                  <Table2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.columns.length}</span>
                  {hasError && <span className="h-1.5 w-1.5 rounded-full bg-destructive" title="Has errors" />}
                  {!hasError && hasWarning && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Has warnings" />}
                  {!readOnly && (
                    <Trash2
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); actions.removeTable(t.id); }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">Tips</p>
            <p>Double-click canvas to add a table.</p>
            <p>Drag a column handle to link tables.</p>
            <p>Shift-click or shift-drag to multi-select.</p>
            <p>Press <kbd className="rounded border px-0.5">⌘K</kbd> for commands.</p>
            <p><kbd className="rounded border px-0.5">⌘Z</kbd> / <kbd className="rounded border px-0.5">⌘⇧Z</kbd> undo/redo.</p>
            {diagramId && <p><kbd className="rounded border px-0.5">⌘S</kbd> to save.</p>}
          </div>
        </aside>

        {/* ---- center: canvas ---- */}
        <main className="relative min-w-0 flex-1">
          <Canvas ref={canvasRef} />
          {selectedIds.size > 1 && !readOnly && (
            <BulkActionBar
              selectedIds={selectedIds}
              onDelete={() => actions.bulkDeleteTables([...selectedIds])}
            />
          )}
        </main>

        {/* ---- right: inspector / sql / history ---- */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-border">
          <div className="flex shrink-0 border-b border-border">
            <TabButton active={tab === "properties"} onClick={() => setTab("properties")}>
              <PanelRight className="mr-1.5 h-3.5 w-3.5" /> Properties
            </TabButton>
            <TabButton active={tab === "sql"} onClick={() => setTab("sql")}>
              <Code2 className="mr-1.5 h-3.5 w-3.5" /> SQL
            </TabButton>
            {diagramId && user && (
              <TabButton active={tab === "history"} onClick={() => setTab("history")}>
                <History className="mr-1.5 h-3.5 w-3.5" /> History
              </TabButton>
            )}
          </div>
          <div className="min-h-0 flex-1">
            {tab === "properties" && <Inspector />}
            {tab === "sql" && <SqlPanel />}
            {tab === "history" && diagramId && <VersionHistoryPanel diagramId={diagramId} />}
          </div>
        </aside>
      </div>

      <Toaster />

      <ImportSqlDialog open={importOpen} onOpenChange={setImportOpen} />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        canvasRef={canvasRef}
        onShowSql={() => setTab("sql")}
        onImport={() => setImportOpen(true)}
      />
    </div>
  );
}

// ── BulkActionBar ─────────────────────────────────────────────────────────────

function BulkActionBar({ selectedIds, onDelete }: { selectedIds: Set<string>; onDelete: () => void }) {
  return (
    <div
      data-export-ignore
      className="absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border bg-card/95 px-4 py-2 shadow-xl backdrop-blur"
    >
      <span className="text-xs font-medium text-muted-foreground">{selectedIds.size} tables selected</span>
      <div className="h-4 w-px bg-border" />
      <div className="flex gap-1">
        {["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#ec4899","#8b5cf6","#14b8a6"].map((color) => (
          <button
            key={color}
            onClick={() => actions.bulkRecolorTables([...selectedIds], color)}
            className="h-5 w-5 rounded-full border-2 border-transparent transition hover:scale-110 hover:border-white"
            style={{ background: color }}
            title={`Recolor to ${color}`}
          />
        ))}
      </div>
      <div className="h-4 w-px bg-border" />
      <Button size="sm" variant="destructive" className="h-7" onClick={onDelete}>
        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
      </Button>
    </div>
  );
}

// ── TabButton ─────────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center py-2.5 text-xs font-medium transition",
        active ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
