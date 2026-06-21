import { useMemo, useState } from "react";
import { Copy, Check, Download, Edit, AlertCircle } from "lucide-react";
import { generateSql, tableSql } from "@/lib/erd/sql";
import { useDiagram, actions } from "@/lib/erd/store";
import type { Dialect, Diagram } from "@/lib/erd/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { diffDiagrams } from "@/lib/erd/diff";
import type { MigrationDiff } from "@/lib/erd/diff";
import { parseSql } from "@/lib/erd/parse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DIALECTS: { value: Dialect; label: string }[] = [
  { value: "postgres", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
];

function highlightSql(sql: string) {
  const keywords = /\b(CREATE|TABLE|ALTER|DROP|ADD|CONSTRAINT|PRIMARY|KEY|FOREIGN|REFERENCES|NOT|NULL|UNIQUE|DEFAULT|COMMENT|ON|COLUMN|IS|INDEX|INT|BIGINT|VARCHAR|TEXT|BOOLEAN|TIMESTAMP|DATE|NUMERIC|JSON|JSONB|SERIAL|TINYINT|DATETIME|DECIMAL|REAL|INTEGER|TINYINT)\b/gi;
  const parts = sql.split(/(\s+|[,().'"`;]|--[^\n]*\n)/);
  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith("--")) {
      return <span key={index} className="text-emerald-500/80 italic">{part}</span>;
    }
    if (part.match(keywords)) {
      return <span key={index} className="text-sky-400 font-semibold">{part.toUpperCase()}</span>;
    }
    if (part.startsWith("'") || part.startsWith('"') || part.startsWith('`')) {
      return <span key={index} className="text-amber-500 font-mono">{part}</span>;
    }
    if (part.match(/^\d+$/)) {
      return <span key={index} className="text-indigo-400">{part}</span>;
    }
    return <span key={index}>{part}</span>;
  });
}

function RenderDiff({ diff }: { diff: MigrationDiff }) {
  const hasChanges = diff.tableDiffs.length > 0 || diff.relationshipDiffs.length > 0;
  if (!hasChanges) {
    return <p className="text-xs text-muted-foreground">No changes detected.</p>;
  }

  return (
    <div className="space-y-4 max-h-64 overflow-y-auto pr-1 text-xs">
      {diff.tableDiffs.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Tables</h4>
          <ul className="space-y-1.5 font-mono">
            {diff.tableDiffs.map((td, idx) => {
              if (td.kind === "added") {
                return (
                  <li key={idx} className="text-emerald-500 flex items-start gap-1.5">
                    <span className="font-bold">+</span>
                    <span>Create table <strong>"{td.table.name}"</strong></span>
                  </li>
                );
              }
              if (td.kind === "dropped") {
                return (
                  <li key={idx} className="text-destructive flex items-start gap-1.5">
                    <span className="font-bold">-</span>
                    <span>Drop table <strong>"{td.table.name}"</strong></span>
                  </li>
                );
              }
              return (
                <li key={idx} className="text-amber-500 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold">~</span>
                    <span>Alter table <strong>"{td.table.name}"</strong></span>
                  </div>
                  {td.columnDiffs && td.columnDiffs.length > 0 && (
                    <ul className="pl-6 space-y-1 text-muted-foreground border-l border-amber-500/20 ml-2">
                      {td.columnDiffs.map((cd, cidx) => {
                        if (cd.kind === "added") {
                          return (
                            <li key={cidx} className="text-emerald-500/90 flex items-start gap-1">
                              <span>+</span>
                              <span>Add column <strong>"{cd.column.name}"</strong> <span className="text-[10px] text-muted-foreground">({cd.column.type})</span></span>
                            </li>
                          );
                        }
                        if (cd.kind === "dropped") {
                          return (
                            <li key={cidx} className="text-destructive/90 flex items-start gap-1">
                              <span>-</span>
                              <span>Drop column <strong>"{cd.column.name}"</strong></span>
                            </li>
                          );
                        }
                        return (
                          <li key={cidx} className="text-amber-500/90 flex items-start gap-1">
                            <span>~</span>
                            <span>Alter column <strong>"{cd.column.name}"</strong></span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {diff.relationshipDiffs.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Relationships</h4>
          <ul className="space-y-1.5 font-mono">
            {diff.relationshipDiffs.map((rd, idx) => {
              if (rd.kind === "added") {
                return (
                  <li key={idx} className="text-emerald-500 flex items-start gap-1.5">
                    <span className="font-bold">+</span>
                    <span>Add constraint foreign key: <strong>{rd.sourceTable}.{rd.sourceColumn}</strong> &rarr; <strong>{rd.targetTable}.{rd.targetColumn}</strong></span>
                  </li>
                );
              }
              return (
                <li key={idx} className="text-destructive flex items-start gap-1.5">
                  <span className="font-bold">-</span>
                  <span>Drop constraint foreign key: <strong>{rd.sourceTable}.{rd.sourceColumn}</strong> &rarr; <strong>{rd.targetTable}.{rd.targetColumn}</strong></span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SqlPanel() {
  const diagram = useDiagram();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSql, setEditSql] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("all");

  // Diff dialog state
  const [diffOpen, setDiffOpen] = useState(false);
  const [pendingDiff, setPendingDiff] = useState<MigrationDiff | null>(null);
  const [pendingDiagram, setPendingDiagram] = useState<Diagram | null>(null);

  const displayedSql = useMemo(() => {
    if (selectedTableId === "all") {
      return generateSql(diagram);
    }
    const t = diagram.tables.find((tbl) => tbl.id === selectedTableId);
    if (!t) return "-- Table not found";
    return tableSql(t, diagram);
  }, [diagram, selectedTableId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(displayedSql);
      setCopied(true);
      toast.success("SQL copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  const download = () => {
    const blob = new Blob([displayedSql], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedTableId === "all"
      ? `${diagram.name.replace(/\s+/g, "_").toLowerCase()}.sql`
      : `${diagram.tables.find((t) => t.id === selectedTableId)?.name ?? "table"}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyChanges = () => {
    const parsed = parseSql(editSql);
    if (!parsed.diagram) {
      setErrors(parsed.errors);
      toast.error("SQL parsing failed. See errors below.");
      return;
    }

    const diff = diffDiagrams(diagram, parsed.diagram);
    const hasChanges = diff.tableDiffs.length > 0 || diff.relationshipDiffs.length > 0;

    if (!hasChanges) {
      setIsEditing(false);
      setErrors([]);
      toast.info("No changes detected in SQL.");
      return;
    }

    setPendingDiff(diff);
    setPendingDiagram(parsed.diagram);
    setDiffOpen(true);
  };

  const confirmApplyChanges = () => {
    const res = actions.updateDiagramFromSql(editSql);
    if (res.success) {
      setIsEditing(false);
      setErrors([]);
      setDiffOpen(false);
      setPendingDiff(null);
      setPendingDiagram(null);
      toast.success("Diagram updated from SQL");
    } else {
      setErrors(res.errors);
      setDiffOpen(false);
      toast.error("SQL parsing failed. See errors below.");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border p-3 justify-between">
        <div className="flex items-center gap-1">
          {DIALECTS.map((d) => (
            <button
              key={d.value}
              disabled={isEditing}
              onClick={() => actions.setDialect(d.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer",
                isEditing && "opacity-50 cursor-not-allowed",
                diagram.dialect === d.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Table Selector Dropdown */}
        {!isEditing && (
          <select
            value={selectedTableId}
            onChange={(e) => setSelectedTableId(e.target.value)}
            className="rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground focus:outline-none cursor-pointer"
          >
            <option value="all">All Tables</option>
            {diagram.tables.map((t) => (
              <option key={t.id} value={t.id}>
                Table: {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2">
        {isEditing ? (
          <span className="text-xs font-semibold text-amber-500 animate-pulse">
            Editing SQL Mode
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {selectedTableId === "all" ? (
              `${diagram.tables.length} table${diagram.tables.length !== 1 ? "s" : ""}`
            ) : (
              `1 table isolated`
            )}
          </span>
        )}
        <div className="flex gap-1">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setErrors([]);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApplyChanges}
              >
                Apply Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditSql(generateSql(diagram));
                  setIsEditing(true);
                  setErrors([]);
                }}
              >
                <Edit className="mr-1 h-3.5 w-3.5" /> Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={download}>
                <Download className="mr-1 h-3.5 w-3.5" /> .sql
              </Button>
              <Button size="sm" variant="outline" onClick={copy}>
                {copied ? (
                  <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="mr-1 h-3.5 w-3.5" />
                )}
                Copy
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <textarea
          value={editSql}
          onChange={(e) => setEditSql(e.target.value)}
          spellCheck={false}
          className="flex-1 w-full h-full p-4 font-mono text-xs bg-muted/20 border-t border-border focus:outline-none resize-none text-foreground leading-relaxed"
          placeholder="-- Write SQL CREATE TABLE statements here..."
        />
      ) : (
        <pre className="flex-1 overflow-auto bg-muted/30 px-4 py-3 font-mono text-xs leading-relaxed text-foreground select-text">
          <code>{highlightSql(displayedSql)}</code>
        </pre>
      )}

      {isEditing && errors.length > 0 && (
        <div className="border-t border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive max-h-32 overflow-y-auto">
          <div className="flex items-center gap-1 font-semibold mb-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>SQL Parse Errors:</span>
          </div>
          <ul className="list-disc pl-4 space-y-0.5 font-mono">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* SQL Diff Dialog */}
      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="dark max-w-lg bg-background text-foreground border-border">
          <DialogHeader>
            <DialogTitle>Confirm SQL Changes</DialogTitle>
            <DialogDescription>
              Review the structural differences between your SQL DDL statements and the active diagram before applying them:
            </DialogDescription>
          </DialogHeader>

          {pendingDiff && <RenderDiff diff={pendingDiff} />}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDiffOpen(false)}>
              Cancel &amp; Edit
            </Button>
            <Button onClick={confirmApplyChanges}>
              Confirm &amp; Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

