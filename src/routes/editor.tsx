import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Database,
  Plus,
  Table2,
  Trash2,
  Sparkles,
  Eraser,
  Github,
  Network,
  PanelRight,
  Code2,
} from "lucide-react";
import { Canvas, type CanvasHandle } from "@/components/erd/Canvas";
import { DiagramFileMenu } from "@/components/erd/DiagramFileMenu";
import { Inspector } from "@/components/erd/Inspector";
import { SqlPanel } from "@/components/erd/SqlPanel";
import { ImportSqlDialog } from "@/components/erd/ImportSqlDialog";
import { actions, hydrate, useDiagram, useSelectedTableId } from "@/lib/erd/store";
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
  const canvasRef = useRef<CanvasHandle>(null);
  const [tab, setTab] = useState<"properties" | "sql">("properties");

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <div className="dark flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* top bar */}
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
        <div className="flex items-center gap-2">
          <DiagramFileMenu canvasRef={canvasRef} />
          <div className="mx-1 h-5 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={() => actions.autoLayout()}>
            <Network className="mr-1 h-3.5 w-3.5" /> Auto layout
          </Button>
          <Button variant="ghost" size="sm" onClick={() => actions.loadSample()}>
            <Sparkles className="mr-1 h-3.5 w-3.5" /> Sample
          </Button>
          <ImportSqlDialog />
          <Button variant="ghost" size="sm" onClick={() => actions.clearAll()}>
            <Eraser className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center rounded-md px-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="View on GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
          <Button size="sm" onClick={() => setTab("sql")}>
            <Code2 className="mr-1 h-3.5 w-3.5" /> Generate SQL
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* left: tables list */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tables
            </h2>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => actions.addTable()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
            {diagram.tables.length === 0 && (
              <p className="px-2 py-4 text-xs text-muted-foreground">
                No tables yet. Click + to add one.
              </p>
            )}
            {diagram.tables.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  actions.selectTable(t.id);
                  setTab("properties");
                }}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
                  t.id === selectedId ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: t.color }}
                />
                <Table2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.columns.length}</span>
                <Trash2
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.removeTable(t.id);
                  }}
                />
              </button>
            ))}
          </div>
          <div className="border-t border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">Tips</p>
            <p>Double-click canvas to add a table.</p>
            <p>Drag the dot on a column to link tables.</p>
            <p>Use Auto layout to arrange tables on the canvas.</p>
            <p>Save or export your diagram from the toolbar.</p>
            <p>Click a relationship line to delete it.</p>
          </div>
        </aside>

        {/* center: canvas */}
        <main className="relative min-w-0 flex-1">
          <Canvas ref={canvasRef} />
        </main>

        {/* right: inspector / sql */}
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
    </div>
  );
}

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
