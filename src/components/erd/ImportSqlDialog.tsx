import { useState } from "react";
import { FileCode2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parseSql } from "@/lib/erd/parse";
import { actions } from "@/lib/erd/store";
import { toast } from "sonner";

const PLACEHOLDER = `CREATE TABLE users (
  id uuid PRIMARY KEY,
  email varchar NOT NULL UNIQUE,
  created_at timestamp DEFAULT now()
);

CREATE TABLE posts (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  title varchar NOT NULL
);`;

export function ImportSqlDialog() {
  const [open, setOpen] = useState(false);
  const [sql, setSql] = useState("");

  function handleImport() {
    const { diagram, errors } = parseSql(sql);
    if (!diagram) {
      toast.error(errors[0] ?? "Could not parse SQL.");
      return;
    }
    actions.importDiagram(diagram);
    setOpen(false);
    setSql("");
    const relCount = diagram.relationships.length;
    toast.success(
      `Imported ${diagram.tables.length} table${diagram.tables.length === 1 ? "" : "s"}` +
        (relCount ? ` and ${relCount} relationship${relCount === 1 ? "" : "s"}.` : "."),
    );
    if (errors.length) toast.warning(errors[0]);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <FileCode2 className="mr-1 h-3.5 w-3.5" /> Import SQL
        </Button>
      </DialogTrigger>
      <DialogContent className="dark max-w-2xl bg-background text-foreground">
        <DialogHeader>
          <DialogTitle>Import SQL</DialogTitle>
          <DialogDescription>
            Paste your <code>CREATE TABLE</code> statements. Primary keys, unique
            constraints, and foreign keys are detected automatically. This replaces the
            current diagram.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          className="h-72 resize-none font-mono text-xs"
        />
        <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>Importing replaces your existing tables and relationships.</span>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!sql.trim()}>
            Import schema
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
