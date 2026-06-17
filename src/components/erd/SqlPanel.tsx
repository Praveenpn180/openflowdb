import { useMemo, useState } from "react";
import { Copy, Check, Download } from "lucide-react";
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
            onClick={() => actions.setDialect(d.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition",
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
        <span className="text-xs text-muted-foreground">
          {diagram.tables.length} table{diagram.tables.length !== 1 && "s"}
        </span>
        <div className="flex gap-1">
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
        </div>
      </div>

      <pre className="flex-1 overflow-auto bg-muted/30 px-4 py-3 font-mono text-xs leading-relaxed text-foreground">
        <code>{sql}</code>
      </pre>
    </div>
  );
}
