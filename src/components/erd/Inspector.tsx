import { useMemo, useState } from "react";
import { Plus, Trash2, KeyRound, Link2, AlertCircle, AlertTriangle, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { actions, useDiagram, useSelectedTableId, useSelectedTableIds } from "@/lib/erd/store";
import { COLUMN_TYPES, TABLE_COLORS, type RelationKind, type Index } from "@/lib/erd/types";
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

  const [draggingColId, setDraggingColId] = useState<string | null>(null);
  const [selectedColIds, setSelectedColIds] = useState<Set<string>>(new Set());
  const [prevTableId, setPrevTableId] = useState<string | null>(null);

  if (table && table.id !== prevTableId) {
    setPrevTableId(table.id);
    setSelectedColIds(new Set());
  }

  const getBaseAndParams = (fullType: string) => {
    const t = fullType.toLowerCase().trim();
    const match = t.match(/^([a-z0-9_]+)(?:\s*\(([^)]+)\))?$/);
    const base = match ? match[1] : t;
    const params = match ? match[2] : "";
    return { base, params };
  };

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
          <Label className="text-xs text-muted-foreground">Description</Label>
          <textarea
            value={table.description ?? ""}
            onChange={(e) => actions.updateTable(table.id, { description: e.target.value })}
            placeholder="Add description or notes..."
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
          <Label htmlFor="lock-position" className="text-muted-foreground">Lock position on canvas</Label>
          <Switch
            id="lock-position"
            checked={table.isLocked ?? false}
            onCheckedChange={(checked) => actions.updateTable(table.id, { isLocked: checked })}
            className="scale-90"
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
            {/* Custom Color Picker Swatch */}
            <label
              className={cn(
                "relative h-6 w-6 rounded-full border transition hover:scale-110 flex items-center justify-center cursor-pointer overflow-hidden",
                !TABLE_COLORS.includes(table.color as any)
                  ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                  : "bg-muted hover:bg-muted/80"
              )}
              style={{
                background: !TABLE_COLORS.includes(table.color as any) ? table.color : undefined,
              }}
              title="Custom Color"
              aria-label="Set custom color"
            >
              <Plus className={cn("h-3.5 w-3.5", !TABLE_COLORS.includes(table.color as any) ? "text-white mix-blend-difference" : "text-muted-foreground")} />
              <input
                type="color"
                value={TABLE_COLORS.includes(table.color as any) ? "#ffffff" : table.color}
                onChange={(e) => actions.updateTable(table.id, { color: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
              />
            </label>
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
          <div className="flex items-center gap-2">
            {selectedColIds.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  actions.bulkDeleteColumns(table.id, Array.from(selectedColIds));
                  setSelectedColIds(new Set());
                }}
                className="h-7 text-xs px-2"
              >
                <Trash2 className="mr-1 h-3 w-3" /> Delete ({selectedColIds.size})
              </Button>
            )}
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
        </div>

        <div className="space-y-3 px-4 pb-4">
          {table.columns.map((col, index) => {
            const isFirst = index === 0;
            const isLast = index === table.columns.length - 1;
            const colIssues = issues.filter((i) => i.columnId === col.id);
            const { base: typeBase, params: typeParams } = getBaseAndParams(col.type);
            const isDragging = draggingColId === col.id;

            return (
              <div
                key={col.id}
                draggable
                onDragStart={(e) => {
                  setDraggingColId(col.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggingColId && draggingColId !== col.id) {
                    actions.reorderColumns(table.id, draggingColId, col.id);
                  }
                }}
                onDragEnd={() => {
                  setDraggingColId(null);
                  actions.commitMove();
                }}
                className={cn(
                  "rounded-lg border border-border bg-muted/30 p-3 transition-opacity",
                  isDragging && "opacity-40",
                  colIssues.some((i) => i.severity === "error") && "border-destructive/40",
                  colIssues.some((i) => i.severity === "warning") &&
                    !colIssues.some((i) => i.severity === "error") &&
                    "border-amber-500/40",
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground transition-colors p-0.5 shrink-0" title="Drag to reorder">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedColIds.has(col.id)}
                    onChange={(e) => {
                      const next = new Set(selectedColIds);
                      if (e.target.checked) {
                        next.add(col.id);
                      } else {
                        next.delete(col.id);
                      }
                      setSelectedColIds(next);
                    }}
                    className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-primary cursor-pointer shrink-0"
                  />
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && isLast) {
                        e.preventDefault();
                        const newId = actions.addColumn(table.id);
                        setNewlyAddedColId(newId);
                      }
                    }}
                    className="h-8 text-sm flex-1"
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
                  value={typeBase}
                  onChange={(e) => {
                    const nextBase = e.target.value;
                    let nextType = nextBase;
                    if (nextBase === "varchar") nextType = "varchar(255)";
                    else if (nextBase === "numeric") nextType = "numeric(10,2)";
                    actions.updateColumn(table.id, col.id, { type: nextType });
                  }}
                  className="mt-2 h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-mono"
                >
                  {COLUMN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  {!COLUMN_TYPES.includes(typeBase as never) && (
                    <option value={typeBase}>{typeBase}</option>
                  )}
                </select>

                {typeBase === "varchar" && (
                  <div className="mt-2 flex items-center gap-2">
                    <Label className="text-[11px] text-muted-foreground shrink-0">Length:</Label>
                    <Input
                      type="number"
                      value={typeParams || "255"}
                      onChange={(e) => {
                        const len = e.target.value || "255";
                        actions.updateColumn(table.id, col.id, { type: `varchar(${len})` });
                      }}
                      className="h-7 text-xs font-mono w-24"
                    />
                  </div>
                )}

                {(typeBase === "numeric" || typeBase === "decimal") && (
                  <div className="mt-2 flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-[11px] text-muted-foreground shrink-0">Precision:</Label>
                      <Input
                        type="number"
                        value={typeParams.split(",")[0] || "10"}
                        onChange={(e) => {
                          const prec = e.target.value || "10";
                          const scale = typeParams.split(",")[1] || "2";
                          actions.updateColumn(table.id, col.id, { type: `numeric(${prec},${scale})` });
                        }}
                        className="h-7 text-xs font-mono w-16"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-[11px] text-muted-foreground shrink-0">Scale:</Label>
                      <Input
                        type="number"
                        value={typeParams.split(",")[1] || "2"}
                        onChange={(e) => {
                          const prec = typeParams.split(",")[0] || "10";
                          const scale = e.target.value || "2";
                          actions.updateColumn(table.id, col.id, { type: `numeric(${prec},${scale})` });
                        }}
                        className="h-7 text-xs font-mono w-16"
                      />
                    </div>
                  </div>
                )}

                {typeBase === "enum" && (
                  <div className="mt-2 space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Enum values (comma-separated)</Label>
                    <Input
                      value={(col.values || []).join(", ")}
                      onChange={(e) => {
                        const vals = e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter((v) => v.length > 0);
                        actions.updateColumn(table.id, col.id, { values: vals });
                      }}
                      className="h-7 text-xs font-mono"
                      placeholder="e.g. active, inactive, pending"
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(col.values || []).map((val) => (
                        <span key={val} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                          {val}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

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

                {/* Default value helper suggestions */}
                {["boolean", "timestamp", "date", "uuid"].includes(typeBase) && (
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {typeBase === "boolean" && (
                      <>
                        <button
                          type="button"
                          onClick={() => actions.updateColumn(table.id, col.id, { defaultValue: "true" })}
                          className={cn(
                            "px-2 py-0.5 rounded border text-[10px] hover:bg-muted font-mono transition-colors",
                            col.defaultValue === "true" ? "border-primary text-primary bg-primary/5" : "text-muted-foreground border-border"
                          )}
                        >
                          true
                        </button>
                        <button
                          type="button"
                          onClick={() => actions.updateColumn(table.id, col.id, { defaultValue: "false" })}
                          className={cn(
                            "px-2 py-0.5 rounded border text-[10px] hover:bg-muted font-mono transition-colors",
                            col.defaultValue === "false" ? "border-primary text-primary bg-primary/5" : "text-muted-foreground border-border"
                          )}
                        >
                          false
                        </button>
                      </>
                    )}
                    {(typeBase === "timestamp" || typeBase === "date") && (
                      <>
                        <button
                          type="button"
                          onClick={() => actions.updateColumn(table.id, col.id, { defaultValue: "now()" })}
                          className="px-2 py-0.5 rounded border border-border text-[10px] hover:bg-muted text-muted-foreground font-mono transition-colors"
                        >
                          now()
                        </button>
                        <button
                          type="button"
                          onClick={() => actions.updateColumn(table.id, col.id, { defaultValue: "CURRENT_TIMESTAMP" })}
                          className="px-2 py-0.5 rounded border border-border text-[10px] hover:bg-muted text-muted-foreground font-mono transition-colors"
                        >
                          CURRENT_TIMESTAMP
                        </button>
                      </>
                    )}
                    {typeBase === "uuid" && (
                      <>
                        <button
                          type="button"
                          onClick={() => actions.updateColumn(table.id, col.id, { defaultValue: "gen_random_uuid()" })}
                          className="px-2 py-0.5 rounded border border-border text-[10px] hover:bg-muted text-muted-foreground font-mono transition-colors"
                        >
                          gen_random_uuid()
                        </button>
                        <button
                          type="button"
                          onClick={() => actions.updateColumn(table.id, col.id, { defaultValue: "uuid_generate_v4()" })}
                          className="px-2 py-0.5 rounded border border-border text-[10px] hover:bg-muted text-muted-foreground font-mono transition-colors"
                        >
                          uuid_generate_v4()
                        </button>
                      </>
                    )}
                  </div>
                )}

                <Input
                  value={col.comment ?? ""}
                  onChange={(e) =>
                    actions.updateColumn(table.id, col.id, {
                      comment: e.target.value || undefined,
                    })
                  }
                  className="mt-2 h-7 text-xs"
                  placeholder="comment/description (optional)"
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
            <div className="space-y-2 px-4 pb-4">
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

        {/* ---- indexes ---- */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border mt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Indexes
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => actions.addIndex(table.id)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add
          </Button>
        </div>

        <div className="space-y-3 px-4 pb-6">
          {(table.indexes || []).map((idx) => (
            <div key={idx.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={idx.name}
                  onChange={(e) => actions.updateIndex(table.id, idx.id, { name: e.target.value })}
                  placeholder="index_name"
                  className="h-8 text-sm"
                />
                <button
                  onClick={() => actions.removeIndex(table.id, idx.id)}
                  className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete index"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Checkbox columns list for index columns selection */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Index Columns</Label>
                <div className="flex flex-wrap gap-1.5 rounded-md border border-input p-1.5 bg-background">
                  {table.columns.map((c) => {
                    const isChecked = idx.columnIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 hover:bg-muted text-xs cursor-pointer select-none border border-border/40">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newCols = e.target.checked
                              ? [...idx.columnIds, c.id]
                              : idx.columnIds.filter((cid) => cid !== c.id);
                            actions.updateIndex(table.id, idx.id, { columnIds: newCols });
                          }}
                          className="scale-90"
                        />
                        <span className="font-mono">{c.name || "column"}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Unique index constraint */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-muted-foreground">Unique Index</span>
                <Switch
                  checked={idx.isUnique}
                  onCheckedChange={(checked) => actions.updateIndex(table.id, idx.id, { isUnique: checked })}
                  className="scale-75"
                />
              </div>
            </div>
          ))}
          {(table.indexes || []).length === 0 && (
            <p className="text-xs text-muted-foreground italic px-1 pb-2">No indexes defined.</p>
          )}
        </div>
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
