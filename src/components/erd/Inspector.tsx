import { useMemo, useState } from "react";
import { Plus, Trash2, KeyRound, Link2, AlertCircle, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { actions, useDiagram, useSelectedTableId, useSelectedTableIds } from "@/lib/erd/store";
import { COLUMN_TYPES, TABLE_COLORS, type RelationKind } from "@/lib/erd/types";
import { validateTable } from "@/lib/erd/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const RELATION_KIND_LABELS: Record<RelationKind, string> = {
  "1-1": "One-to-One",
  "1-n": "One-to-Many",
  "n-n": "Many-to-Many",
};

export function Inspector() {
  const diagram = useDiagram();
  const selectedId = useSelectedTableId();
  const selectedIds = useSelectedTableIds();
  const table = diagram.tables.find((t) => t.id === selectedId);
  const [newlyAddedColId, setNewlyAddedColId] = useState<string | null>(null);

  // Relationships involving this table (as source or target)
  const tableRelationships = useMemo(() => {
    if (!table) return [];
    return diagram.relationships.filter(
      (r) => r.sourceTableId === table.id || r.targetTableId === table.id,
    );
  }, [diagram.relationships, table]);

  const issues = useMemo(
    () => (table ? validateTable(diagram, table) : []),
    [diagram, table],
  );
  const tableIssues = issues.filter((i) => !i.columnId);

  // ---- multi-select mode ----
  if (!table && selectedIds.size > 1) {
    return <MultiSelectPanel selectedIds={selectedIds} />;
  }

  if (!table) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">No table selected</p>
        <p className="text-xs text-muted-foreground">
          Select a table to edit its properties, or double-click the canvas to add one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ---- table header / metadata ---- */}
      <div className="space-y-3 border-b border-border p-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Table name</Label>
          <Input
            value={table.name}
            onChange={(e) => actions.updateTable(table.id, { name: e.target.value })}
            className="font-medium"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Color</Label>
          <div className="flex flex-wrap gap-1.5">
            {TABLE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => actions.updateTable(table.id, { color: c })}
                className={cn(
                  "h-6 w-6 rounded-full border transition hover:scale-110",
                  table.color === c && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                )}
                style={{ background: c }}
                aria-label={`Set color ${c}`}
              />
            ))}
          </div>
        </div>

        {/* table-level validation issues */}
        {tableIssues.length > 0 && (
          <ul className="space-y-1">
            {tableIssues.map((issue) => (
              <li
                key={issue.code}
                className={cn(
                  "flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs",
                  issue.severity === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                )}
              >
                {issue.severity === "error" ? (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* ---- columns ---- */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Columns
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const newId = actions.addColumn(table.id);
              setNewlyAddedColId(newId);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>

        <div className="space-y-3 px-4 pb-4">
          {table.columns.map((col, index) => {
            const isFirst = index === 0;
            const isLast = index === table.columns.length - 1;
            const colIssues = issues.filter((i) => i.columnId === col.id);
            return (
              <div
                key={col.id}
                className={cn(
                  "rounded-lg border border-border bg-muted/30 p-3",
                  colIssues.some((i) => i.severity === "error") && "border-destructive/40",
                  colIssues.some((i) => i.severity === "warning") &&
                    !colIssues.some((i) => i.severity === "error") &&
                    "border-amber-500/40",
                )}
              >
                <div className="flex items-center gap-2">
                  <Input
                    ref={(el) => {
                      if (el && newlyAddedColId === col.id) {
                        el.focus();
                        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
                        setNewlyAddedColId(null);
                      }
                    }}
                    value={col.name}
                    onChange={(e) =>
                      actions.updateColumn(table.id, col.id, { name: e.target.value })
                    }
                    className="h-8 text-sm"
                    placeholder="column_name"
                  />
                  <button
                    onClick={() => actions.moveColumn(table.id, col.id, "up")}
                    disabled={isFirst}
                    className="rounded p-1.5 text-muted-foreground transition hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Move column up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => actions.moveColumn(table.id, col.id, "down")}
                    disabled={isLast}
                    className="rounded p-1.5 text-muted-foreground transition hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Move column down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => actions.removeColumn(table.id, col.id)}
                    className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete column"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <select
                  value={col.type}
                  onChange={(e) =>
                    actions.updateColumn(table.id, col.id, { type: e.target.value })
                  }
                  className="mt-2 h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-mono"
                >
                  {COLUMN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  {!COLUMN_TYPES.includes(col.type as never) && (
                    <option value={col.type}>{col.type}</option>
                  )}
                </select>

                <div className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
                  <Toggle
                    label="Primary"
                    icon={<KeyRound className="h-3 w-3 text-amber-500" />}
                    checked={col.isPrimary}
                    onChange={(v) =>
                      actions.updateColumn(table.id, col.id, {
                        isPrimary: v,
                        isNullable: v ? false : col.isNullable,
                      })
                    }
                  />
                  <Toggle
                    label="Unique"
                    checked={col.isUnique}
                    onChange={(v) => actions.updateColumn(table.id, col.id, { isUnique: v })}
                  />
                  <Toggle
                    label="Nullable"
                    checked={col.isNullable}
                    onChange={(v) => actions.updateColumn(table.id, col.id, { isNullable: v })}
                  />
                </div>

                <Input
                  value={col.defaultValue ?? ""}
                  onChange={(e) =>
                    actions.updateColumn(table.id, col.id, {
                      defaultValue: e.target.value || undefined,
                    })
                  }
                  className="mt-2 h-7 font-mono text-xs"
                  placeholder="default value (optional)"
                />

                {/* per-column validation messages */}
                {colIssues.map((issue) => (
                  <p
                    key={issue.code}
                    className={cn(
                      "mt-1.5 flex items-center gap-1 text-[11px]",
                      issue.severity === "error" ? "text-destructive" : "text-amber-500",
                    )}
                  >
                    {issue.severity === "error" ? (
                      <AlertCircle className="h-3 w-3 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                    )}
                    {issue.message}
                  </p>
                ))}
              </div>
            );
          })}
        </div>

        {/* ---- relationships ---- */}
        {tableRelationships.length > 0 && (
          <>
            <div className="border-t border-border px-4 pb-2 pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Relationships
              </h3>
            </div>
            <div className="space-y-2 px-4 pb-6">
              {tableRelationships.map((rel) => {
                const isSource = rel.sourceTableId === table.id;
                const otherTableId = isSource ? rel.targetTableId : rel.sourceTableId;
                const otherTable = diagram.tables.find((t) => t.id === otherTableId);
                const sourceCol = diagram.tables
                  .find((t) => t.id === rel.sourceTableId)
                  ?.columns.find((c) => c.id === rel.sourceColumnId);
                const targetCol = diagram.tables
                  .find((t) => t.id === rel.targetTableId)
                  ?.columns.find((c) => c.id === rel.targetColumnId);

                return (
                  <div
                    key={rel.id}
                    className="rounded-lg border border-border bg-muted/30 p-3 text-xs"
                  >
                    {/* connected table */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">
                          {isSource ? "→" : "←"} {otherTable?.name ?? "unknown"}
                        </span>
                      </div>
                      <button
                        onClick={() => actions.removeRelationship(rel.id)}
                        className="shrink-0 rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Remove relationship"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {/* column mapping */}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {sourceCol?.name ?? "?"} → {targetCol?.name ?? "?"}
                    </p>

                    {/* kind picker */}
                    <div className="mt-2 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Kind</Label>
                      <div className="flex gap-1">
                        {(["1-1", "1-n", "n-n"] as RelationKind[]).map((k) => (
                          <button
                            key={k}
                            onClick={() => actions.updateRelationship(rel.id, { kind: k })}
                            className={cn(
                              "flex-1 rounded border px-2 py-1 font-mono text-[11px] transition",
                              rel.kind === k
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                            )}
                            title={RELATION_KIND_LABELS[k]}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- MultiSelectPanel ----

function MultiSelectPanel({ selectedIds }: { selectedIds: Set<string> }) {
  return (
    <div className="flex h-full flex-col p-4">
      <p className="mb-4 text-sm font-medium">
        {selectedIds.size} tables selected
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Recolor all</Label>
          <div className="flex flex-wrap gap-1.5">
            {TABLE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => actions.bulkRecolorTables([...selectedIds], c)}
                className="h-7 w-7 rounded-full border-2 border-transparent transition hover:scale-110 hover:border-white"
                style={{ background: c }}
                aria-label={`Recolor to ${c}`}
              />
            ))}
          </div>
        </div>

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => actions.bulkDeleteTables([...selectedIds])}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete {selectedIds.size} tables
        </Button>
      </div>

      <p className="mt-auto pt-4 text-xs text-muted-foreground">
        Shift-click tables to add/remove from selection. Shift-drag the canvas background to
        marquee-select.
      </p>
    </div>
  );
}

// ---- Toggle ----

function Toggle({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} className="scale-90" />
      <span className="flex items-center gap-1 text-muted-foreground">
        {icon}
        {label}
      </span>
    </label>
  );
}
