import { useMemo, useState } from "react";
import { Copy, Check, Download, Edit, AlertCircle } from "lucide-react";
import { generateSql } from "@/lib/erd/sql";
import { useDiagram, actions } from "@/lib/erd/store";
import type { Dialect } from "@/lib/erd/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DIALECTS: { value: Dialect; label: string }[] = [
  { value: "postgres", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "sqlite", label: "SQLite" },
];

export function SqlPanel() {
  const diagram = useDiagram();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editSql, setEditSql] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  
  const sql = useMemo(() => generateSql(diagram), [diagram]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      toast.success("SQL copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  const download = () => {
    const blob = new Blob([sql], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${diagram.name.replace(/\s+/g, "_").toLowerCase()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border p-3">
        {DIALECTS.map((d) => (
          <button
            key={d.value}
            disabled={isEditing}
            onClick={() => actions.setDialect(d.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition",
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

      <div className="flex items-center justify-between px-4 py-2">
        {isEditing ? (
          <span className="text-xs font-semibold text-amber-500 animate-pulse">
            Editing SQL Mode
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {diagram.tables.length} table{diagram.tables.length !== 1 && "s"}
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
                onClick={() => {
                  const res = actions.updateDiagramFromSql(editSql);
                  if (res.success) {
                    setIsEditing(false);
                    setErrors([]);
                    toast.success("Diagram updated from SQL");
                  } else {
                    setErrors(res.errors);
                    toast.error("SQL parsing failed. See errors below.");
                  }
                }}
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
                  setEditSql(sql);
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
        <pre className="flex-1 overflow-auto bg-muted/30 px-4 py-3 font-mono text-xs leading-relaxed text-foreground">
          <code>{sql}</code>
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
    </div>
  );
}

