import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Database,
  Plus,
  Trash2,
  ExternalLink,
  LogOut,
  Loader2,
  Calendar,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, signOut } from "@/lib/auth/useAuth";
import { listDiagrams, createDiagram, deleteDiagram, renameDiagram } from "@/lib/diagrams/api";
import { emptyDiagram } from "@/lib/erd/factory";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Diagrams — OpenFlowDB" },
      { name: "description", content: "Manage your saved database diagrams." },
    ],
  }),
  component: DashboardPage,
});

interface DiagramMeta {
  id: string;
  name: string;
  dialect: string;
  updated_at: string;
  created_at: string;
}

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<DiagramMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, authLoading, navigate]);

  // Fetch diagrams
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    listDiagrams()
      .then((data) => setDiagrams(data as DiagramMeta[]))
      .catch(() => toast.error("Failed to load diagrams"))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleNew() {
    setCreating(true);
    try {
      const blank = emptyDiagram();
      const created = await createDiagram(blank.name, blank.dialect, blank);
      navigate({ to: "/editor", search: { id: created.id } });
    } catch {
      toast.error("Failed to create diagram");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this diagram? This cannot be undone.")) return;
    try {
      await deleteDiagram(id);
      setDiagrams((prev) => prev.filter((d) => d.id !== id));
      toast.success("Diagram deleted");
    } catch {
      toast.error("Failed to delete diagram");
    }
  }

  async function handleRenameSubmit(id: string) {
    const name = renameValue.trim();
    if (!name) return;
    try {
      await renameDiagram(id, name);
      setDiagrams((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
      setRenamingId(null);
    } catch {
      toast.error("Failed to rename diagram");
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
  }

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Database className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">OpenFlowDB</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Page title */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <LayoutGrid className="h-6 w-6 text-primary" /> My Diagrams
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {diagrams.length} diagram{diagrams.length !== 1 && "s"} saved to your account.
            </p>
          </div>
          <Button onClick={handleNew} disabled={creating} className="gap-1.5">
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New diagram
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : diagrams.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
            <Database className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No diagrams yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click <strong>New diagram</strong> to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {diagrams.map((d) => (
              <DiagramCard
                key={d.id}
                diagram={d}
                isRenaming={renamingId === d.id}
                renameValue={renameValue}
                onRenameStart={() => { setRenamingId(d.id); setRenameValue(d.name); }}
                onRenameChange={setRenameValue}
                onRenameSubmit={() => handleRenameSubmit(d.id)}
                onRenameCancel={() => setRenamingId(null)}
                onDelete={() => handleDelete(d.id)}
              />
            ))}
          </div>
        )}
      </main>

      <Toaster />
    </div>
  );
}

// ── DiagramCard ───────────────────────────────────────────────────────────────

function DiagramCard({
  diagram,
  isRenaming,
  renameValue,
  onRenameStart,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onDelete,
}: {
  diagram: DiagramMeta;
  isRenaming: boolean;
  renameValue: string;
  onRenameStart: () => void;
  onRenameChange: (v: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onDelete: () => void;
}) {
  const updated = new Date(diagram.updated_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border border-border bg-card p-5",
        "transition-shadow hover:shadow-lg",
      )}
    >
      {/* Dialect badge */}
      <span className="mb-3 inline-flex w-fit items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider text-muted-foreground">
        {diagram.dialect}
      </span>

      {/* Name */}
      {isRenaming ? (
        <form
          onSubmit={(e) => { e.preventDefault(); onRenameSubmit(); }}
          className="mb-1"
        >
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={onRenameCancel}
            onKeyDown={(e) => e.key === "Escape" && onRenameCancel()}
            className="w-full rounded border border-primary bg-transparent px-1 py-0.5 text-sm font-semibold text-foreground outline-none ring-1 ring-primary"
          />
        </form>
      ) : (
        <h3
          className="mb-1 truncate text-sm font-semibold text-foreground cursor-text"
          onDoubleClick={onRenameStart}
          title="Double-click to rename"
        >
          {diagram.name}
        </h3>
      )}

      {/* Updated at */}
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" /> Updated {updated}
      </p>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <Link
          to="/editor"
          search={{ id: diagram.id }}
          className="flex-1"
        >
          <Button size="sm" variant="outline" className="w-full gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </Button>
        </Link>
        <button
          onClick={onDelete}
          className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          aria-label="Delete diagram"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
