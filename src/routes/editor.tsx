import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { Canvas, type CanvasHandle } from "@/components/erd/Canvas";
import { DiagramFileMenu } from "@/components/erd/DiagramFileMenu";
import { GitHubIcon } from "@/components/icons/github-icon";
import { Inspector } from "@/components/erd/Inspector";
import { SqlPanel } from "@/components/erd/SqlPanel";
import { ImportSqlDialog } from "@/components/erd/ImportSqlDialog";
import { CommandPalette } from "@/components/erd/CommandPalette";
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
  component: EditorPage,
});

function EditorPage() {
  const diagram = useDiagram();
  const selectedId = useSelectedTableId();
  const selectedIds = useSelectedTableIds();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const canvasRef = useRef<CanvasHandle>(null);
  const [tab, setTab] = useState<"properties" | "sql">("properties");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Validation summary for sidebar badges
  const issues = validateDiagram(diagram);
  const { errors: issueErrors, warnings: issueWarnings } = diagramIssueSummary(issues);

  useEffect(() => {
    hydrate();
  }, []);

  // ---- global keyboard shortcuts ----
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const tag = (e.target as HTMLElement).tagName;
      const isEditing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // Ctrl/Cmd+K — command palette
      if (mod && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }

      // Undo/redo — always fire (even in inputs, browser default is fine to override)
      if (mod && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        actions.undo();
        return;
      }
      if (mod && e.shiftKey && e.key === "z") {
        e.preventDefault();
        actions.redo();
        return;
      }
      if (mod && e.key === "y") {
        e.preventDefault();
        actions.redo();
        return;
      }

      // Remaining shortcuts skip inputs/textareas
      if (isEditing) return;

      // Ctrl/Cmd+T — add table
      if (mod && e.key === "t") {
        e.preventDefault();
        actions.addTable();
        return;
      }

      // Ctrl/Cmd+L — auto layout
      if (mod && e.key === "l") {
        e.preventDefault();
        actions.autoLayout();
        return;
      }

      // Ctrl/Cmd+0 — fit view
      if (mod && e.key === "0") {
        e.preventDefault();
        canvasRef.current?.fitView();
        return;
      }

      // Ctrl/Cmd+G — generate SQL (switch tab)
      if (mod && e.key === "g") {
        e.preventDefault();
        setTab("sql");
        return;
      }

      // Delete / Backspace — delete selected table(s)
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.size > 1) {
          e.preventDefault();
          actions.bulkDeleteTables([...selectedIds]);
        } else if (selectedId) {
          e.preventDefault();
          actions.removeTable(selectedId);
        }
        return;
      }

      // Escape — deselect
      if (e.key === "Escape") {
        actions.selectTable(null);
        return;
      }
    },
    [selectedId, selectedIds],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
            onChange={(e) => actions.renameDiagram(e.target.value)}
            className="h-8 w-56 border-transparent bg-transparent font-medium hover:border-input focus:border-input"
          />
        </div>

        <div className="flex items-center gap-1">
          {/* undo / redo */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => actions.undo()}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => actions.redo()}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="mx-1 h-5 w-px bg-border" />

          <DiagramFileMenu canvasRef={canvasRef} />

          <div className="mx-1 h-5 w-px bg-border" />

          <Button variant="ghost" size="sm" onClick={() => actions.autoLayout()} title="Ctrl+L">
            <Network className="mr-1 h-3.5 w-3.5" /> Auto layout
          </Button>
          <Button variant="ghost" size="sm" onClick={() => actions.loadSample()}>
            <Sparkles className="mr-1 h-3.5 w-3.5" /> Sample
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
            Import SQL
          </Button>          <Button variant="ghost" size="sm" onClick={() => actions.clearAll()}>
            <Eraser className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
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

          {/* command palette trigger */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => setPaletteOpen(true)}
            title="Command palette (Ctrl+K)"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Commands</span>
            <kbd className="hidden rounded border bg-muted px-1 text-[10px] font-mono sm:inline">
              ⌘K
            </kbd>
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
              {/* schema issue badge */}
              {(issueErrors > 0 || issueWarnings > 0) && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                    issueErrors > 0
                      ? "bg-destructive/20 text-destructive"
                      : "bg-amber-500/20 text-amber-500",
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
              onClick={() => actions.addTable()}
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
                  onClick={() => {
                    actions.selectTable(t.id);
                    setTab("properties");
                  }}
                  className={cn(
                    "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
                    t.id === selectedId
                      ? "bg-accent text-accent-foreground"
                      : isMultiSelected
                        ? "bg-accent/50 text-accent-foreground"
                        : "hover:bg-muted",
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: t.color }}
                  />
                  <Table2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.columns.length}</span>
                  {hasError && (
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" title="Has errors" />
                  )}
                  {!hasError && hasWarning && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Has warnings" />
                  )}
                  <Trash2
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      actions.removeTable(t.id);
                    }}
                  />
                </button>
              );
            })}
          </div>

          <div className="border-t border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">Tips</p>
            <p>Double-click canvas to add a table.</p>
            <p>Drag a column handle to link tables.</p>
            <p>Shift-click or shift-drag to multi-select.</p>
            <p>
              Press <kbd className="rounded border px-0.5">⌘K</kbd> for commands.
            </p>
            <p>
              <kbd className="rounded border px-0.5">⌘Z</kbd> /
              <kbd className="rounded border px-0.5">⌘⇧Z</kbd> undo/redo.
            </p>
          </div>
        </aside>

        {/* ---- center: canvas ---- */}
        <main className="relative min-w-0 flex-1">
          <Canvas ref={canvasRef} />

          {/* multi-select bulk action toolbar */}
          {selectedIds.size > 1 && (
            <BulkActionBar
              selectedIds={selectedIds}
              onDelete={() => actions.bulkDeleteTables([...selectedIds])}
            />
          )}
        </main>

        {/* ---- right: inspector / sql ---- */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-border">
          <div className="flex shrink-0 border-b border-border">
            <TabButton active={tab === "properties"} onClick={() => setTab("properties")}>
              <PanelRight className="mr-1.5 h-3.5 w-3.5" /> Properties
            </TabButton>
            <TabButton active={tab === "sql"} onClick={() => setTab("sql")}>
              <Code2 className="mr-1.5 h-3.5 w-3.5" /> SQL
            </TabButton>
          </div>
          <div className="min-h-0 flex-1">
            {tab === "properties" ? <Inspector /> : <SqlPanel />}
          </div>
        </aside>
      </div>

      <Toaster />

      {/* ImportSqlDialog — controlled open state so command palette can trigger it */}
      <ImportSqlDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Command palette */}
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

// ---- BulkActionBar ----

function BulkActionBar({
  selectedIds,
  onDelete,
}: {
  selectedIds: Set<string>;
  onDelete: () => void;
}) {
  return (
    <div
      data-export-ignore
      className="absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border bg-card/95 px-4 py-2 shadow-xl backdrop-blur"
    >
      <span className="text-xs font-medium text-muted-foreground">
        {selectedIds.size} tables selected
      </span>
      <div className="h-4 w-px bg-border" />
      {/* recolor swatches */}
      <div className="flex gap-1">
        {["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6"].map(
          (color) => (
            <button
              key={color}
              onClick={() => actions.bulkRecolorTables([...selectedIds], color)}
              className="h-5 w-5 rounded-full border-2 border-transparent transition hover:scale-110 hover:border-white"
              style={{ background: color }}
              title={`Recolor to ${color}`}
            />
          ),
        )}
      </div>
      <div className="h-4 w-px bg-border" />
      <Button size="sm" variant="destructive" className="h-7" onClick={onDelete}>
        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
      </Button>
    </div>
  );
}

// ---- TabButton ----

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center py-2.5 text-xs font-medium transition",
        active
          ? "border-b-2 border-primary text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
