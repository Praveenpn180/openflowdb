import { useEffect, useState } from "react";
import {
  History,
  Plus,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listVersions, saveVersion, getVersion, deleteVersion, renameVersion } from "@/lib/diagrams/versions";
import { diffDiagrams, generateAlterSql } from "@/lib/erd/diff";
import { actions, useDiagram } from "@/lib/erd/store";
import type { Diagram } from "@/lib/erd/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VersionMeta {
  id: string;
  label: string | null;
  created_at: string;
}

interface Props {
  diagramId: string;
}

export function VersionHistoryPanel({ diagramId }: Props) {
  const diagram = useDiagram();
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkpointLabel, setCheckpointLabel] = useState("");
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffV1, setDiffV1] = useState("");
  const [diffV2, setDiffV2] = useState("");
  const [diffSql, setDiffSql] = useState<string | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    listVersions(diagramId)
      .then((data) => setVersions(data as VersionMeta[]))
      .catch(() => toast.error("Failed to load version history"))
      .finally(() => setLoading(false));
  }, [diagramId]);

  async function handleSaveCheckpoint() {
    setSaving(true);
    try {
      const v = await saveVersion(diagramId, diagram, checkpointLabel || undefined);
      setVersions((prev) => [{ id: v.id, label: v.label, created_at: v.created_at }, ...prev]);
      setCheckpointLabel("");
      toast.success("Checkpoint saved");
    } catch {
      toast.error("Failed to save checkpoint");
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(versionId: string) {
    if (!confirm("Restore this version? Your current diagram will be replaced.")) return;
    try {
      const v = await getVersion(versionId);
      actions.importDiagram(v.content as Diagram);
      toast.success("Version restored");
    } catch {
      toast.error("Failed to restore version");
    }
  }

  async function handleDelete(versionId: string) {
    try {
      await deleteVersion(versionId);
      setVersions((prev) => prev.filter((v) => v.id !== versionId));
      toast.success("Version deleted");
    } catch {
      toast.error("Failed to delete version");
    }
  }

  async function handleDiff() {
    if (!diffV1 || !diffV2) {
      toast.error("Select two versions to compare");
      return;
    }
    if (diffV1 === diffV2) {
      toast.error("Select two different versions");
      return;
    }
    setDiffLoading(true);
    try {
      const [v1Data, v2Data] = await Promise.all([getVersion(diffV1), getVersion(diffV2)]);
      const diff = diffDiagrams(v1Data.content as Diagram, v2Data.content as Diagram);
      const sql = generateAlterSql(diff, diagram.dialect);
      setDiffSql(sql);
    } catch {
      toast.error("Failed to generate diff");
    } finally {
      setDiffLoading(false);
    }
  }

  async function handleCopyDiff() {
    if (!diffSql) return;
    await navigator.clipboard.writeText(diffSql);
    setCopied(true);
    toast.success("Migration SQL copied");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadDiff() {
    if (!diffSql) return;
    const blob = new Blob([diffSql], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "migration.sql";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Save checkpoint */}
      <div className="space-y-2 border-b border-border p-4">
        <Label className="text-xs text-muted-foreground">Save checkpoint</Label>
        <div className="flex gap-2">
          <Input
            value={checkpointLabel}
            onChange={(e) => setCheckpointLabel(e.target.value)}
            placeholder="Label (optional)"
            className="h-8 text-xs"
            onKeyDown={(e) => e.key === "Enter" && handleSaveCheckpoint()}
          />
          <Button size="sm" onClick={handleSaveCheckpoint} disabled={saving} className="shrink-0 gap-1">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {/* Version list */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Checkpoints ({versions.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="px-4 pb-4">
            <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
              No checkpoints yet. Save one above.
            </p>
          </div>
        ) : (
          <div className="space-y-2 px-4 pb-4">
            {versions.map((v) => (
              <VersionRow
                key={v.id}
                version={v}
                onRestore={() => handleRestore(v.id)}
                onDelete={() => handleDelete(v.id)}
                onRename={(label) => {
                  renameVersion(v.id, label).then(() =>
                    setVersions((prev) =>
                      prev.map((x) => (x.id === v.id ? { ...x, label } : x)),
                    ),
                  );
                }}
              />
            ))}
          </div>
        )}

        {/* Migration diff section */}
        {versions.length >= 2 && (
          <div className="border-t border-border">
            <button
              onClick={() => setDiffOpen((o) => !o)}
              className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:text-foreground"
            >
              {diffOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <History className="h-3.5 w-3.5" />
              Migration diff
            </button>

            {diffOpen && (
              <div className="space-y-3 px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  {(["Before (from)", "After (to)"] as const).map((label, i) => {
                    const val = i === 0 ? diffV1 : diffV2;
                    const set = i === 0 ? setDiffV1 : setDiffV2;
                    return (
                      <div key={label} className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">{label}</Label>
                        <select
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="">— pick version —</option>
                          {versions.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label ??
                                new Date(v.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={handleDiff}
                  disabled={diffLoading}
                >
                  {diffLoading ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <AlertCircle className="mr-1 h-3.5 w-3.5" />
                  )}
                  Generate ALTER TABLE SQL
                </Button>

                {diffSql && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Migration SQL
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={handleCopyDiff}
                          className="rounded p-1 text-muted-foreground hover:text-foreground"
                          title="Copy"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={handleDownloadDiff}
                          className="rounded p-1 text-muted-foreground hover:text-foreground"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-[10px] leading-relaxed text-foreground">
                      {diffSql}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── VersionRow ────────────────────────────────────────────────────────────────

function VersionRow({
  version,
  onRestore,
  onDelete,
  onRename,
}: {
  version: VersionMeta;
  onRestore: () => void;
  onDelete: () => void;
  onRename: (label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(version.label ?? "");

  const formattedDate = new Date(version.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onRename(editLabel.trim() || (version.label ?? ""));
              setEditing(false);
            }}
          >
            <input
              autoFocus
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
              className="w-full rounded border border-primary bg-transparent px-1 py-0.5 text-xs font-medium text-foreground outline-none ring-1 ring-primary"
            />
          </form>
        ) : (
          <p
            className={cn(
              "truncate text-xs font-medium",
              version.label ? "text-foreground" : "italic text-muted-foreground",
            )}
            onDoubleClick={() => setEditing(true)}
            title="Double-click to rename"
          >
            {version.label ?? "Unnamed checkpoint"}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">{formattedDate}</p>
      </div>
      <button
        onClick={onRestore}
        className="shrink-0 rounded p-1 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
        title="Restore this version"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDelete}
        className="shrink-0 rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
        title="Delete checkpoint"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
