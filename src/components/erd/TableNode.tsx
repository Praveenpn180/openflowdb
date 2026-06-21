import { memo, useMemo } from "react";
import { Trash2, KeyRound, Hash, Link2, AlertTriangle, AlertCircle, Lock, Unlock, ChevronDown, ChevronRight } from "lucide-react";
import type { Table } from "@/lib/erd/types";
import { HEADER_HEIGHT, ROW_HEIGHT, TABLE_WIDTH } from "@/lib/erd/types";
import { cn } from "@/lib/utils";
import { useDiagram, actions } from "@/lib/erd/store";
import { validateTable } from "@/lib/erd/validation";

interface Props {
  table: Table;
  /** Primary selected (shows blue ring, opens inspector). */
  selected: boolean;
  /** Part of a multi-select group (shows subtler accent ring). */
  multiSelected?: boolean;
  connecting: boolean;
  connHover?: { columnId: string; isValid: boolean } | null;
  onHeaderPointerDown: (e: React.PointerEvent, tableId: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onHandlePointerDown: (
    e: React.PointerEvent,
    tableId: string,
    columnId: string,
  ) => void;
  onHoverTable?: (id: string | null) => void;
  onHoverColumn?: (id: string | null) => void;
}

export const TableNode = memo(function TableNode({
  table,
  selected,
  multiSelected = false,
  onHeaderPointerDown,
  onSelect,
  onDelete,
  onHandlePointerDown,
  connecting,
  connHover,
  onHoverTable,
  onHoverColumn,
}: Props) {
  const diagram = useDiagram();

  // Run validation for this table; memoised on diagram + table changes.
  const issues = useMemo(() => validateTable(diagram, table), [diagram, table]);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const hasIssues = issues.length > 0;

  // Build a quick column-id → issues map for per-row badges.
  const issuesByColumn = useMemo(() => {
    const m = new Map<string, typeof issues>();
    for (const issue of issues) {
      if (!issue.columnId) continue;
      const arr = m.get(issue.columnId) ?? [];
      arr.push(issue);
      m.set(issue.columnId, arr);
    }
    return m;
  }, [issues]);

  const ringClass = selected
    ? "ring-2 ring-primary shadow-xl"
    : multiSelected
      ? "ring-2 ring-primary/50 shadow-xl"
      : "hover:shadow-xl";

  return (
    <div
      data-table-id={table.id}
      onPointerDown={() => onSelect(table.id)}
      onPointerEnter={() => onHoverTable?.(table.id)}
      onPointerLeave={() => onHoverTable?.(null)}
      className={cn(
        "absolute select-none rounded-xl border bg-card shadow-lg transition-shadow",
        ringClass,
      )}
      style={{ left: table.x, top: table.y, width: TABLE_WIDTH }}
    >
      {/* ---- header ---- */}
      <div
        onPointerDown={(e) => !table.isLocked && onHeaderPointerDown(e, table.id)}
        className={cn(
          "group relative flex items-center justify-between gap-2 rounded-t-xl px-3",
          table.isLocked ? "cursor-default" : "cursor-grab active:cursor-grabbing",
          table.isCollapsed && "rounded-b-xl"
        )}
        style={{ height: HEADER_HEIGHT, background: table.color }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1" title={table.description}>
          {/* Collapse/expand button */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              actions.updateTable(table.id, { isCollapsed: !table.isCollapsed });
            }}
            className="rounded text-white/70 hover:bg-black/20 hover:text-white p-0.5 transition cursor-pointer"
            title={table.isCollapsed ? "Expand table" : "Collapse table"}
          >
            {table.isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          <span className="truncate text-sm font-semibold text-white">{table.name}</span>

          {/* Lock indicator */}
          {table.isLocked && (
            <span title="Position locked" className="flex items-center">
              <Lock className="h-3 w-3 shrink-0 text-white/80" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* validation summary badge */}
          {hasIssues && (
            <span
              onPointerDown={(e) => e.stopPropagation()}
              title={issues.map((i) => i.message).join("\n")}
              className={cn(
                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                errorCount > 0
                  ? "bg-destructive/90 text-white"
                  : "bg-amber-500/90 text-white",
              )}
            >
              {errorCount > 0 ? (
                <AlertCircle className="h-2.5 w-2.5" />
              ) : (
                <AlertTriangle className="h-2.5 w-2.5" />
              )}
              {errorCount > 0 ? errorCount : warningCount}
            </span>
          )}

          {/* Lock toggle button */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              actions.updateTable(table.id, { isLocked: !table.isLocked });
            }}
            className="rounded p-1 text-white/70 opacity-0 transition hover:bg-black/20 hover:text-white group-hover:opacity-100 cursor-pointer"
            title={table.isLocked ? "Unlock position" : "Lock position"}
          >
            {table.isLocked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <Unlock className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(table.id);
            }}
            className="rounded p-1 text-white/70 opacity-0 transition hover:bg-black/20 hover:text-white group-hover:opacity-100 cursor-pointer"
            aria-label="Delete table"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ---- columns ---- */}
      {!table.isCollapsed && (
        <div className="rounded-b-xl">
          {table.columns.length === 0 && (
            <div className="flex items-center gap-2 rounded-b-xl border-t border-border/60 px-3 py-2 text-xs text-muted-foreground italic">
              No columns
            </div>
          )}
          {table.columns.map((col, i) => {
            const colIssues = issuesByColumn.get(col.id) ?? [];
            const colHasError = colIssues.some((ci) => ci.severity === "error");
            const colHasWarning = colIssues.some((ci) => ci.severity === "warning");
            const isHoveredTarget = connHover?.columnId === col.id;
            const isHoveredTargetValid = connHover?.isValid;

            return (
              <div
                key={col.id}
                data-col-id={col.id}
                data-table-id={table.id}
                onPointerEnter={() => onHoverColumn?.(col.id)}
                onPointerLeave={() => onHoverColumn?.(null)}
                className={cn(
                  "group/row relative flex items-center gap-2 border-t border-border/60 px-3 text-xs transition-colors",
                  i === table.columns.length - 1 && "rounded-b-xl",
                  connecting && "hover:bg-accent",
                  colHasError && "bg-destructive/5",
                  colHasWarning && !colHasError && "bg-amber-500/5",
                  isHoveredTarget && isHoveredTargetValid && "bg-emerald-500/15! ring-1 ring-emerald-500/50!",
                  isHoveredTarget && !isHoveredTargetValid && "bg-destructive/15! ring-1 ring-destructive/50!",
                )}
                style={{ height: ROW_HEIGHT }}
                title={
                  colIssues.length > 0
                    ? [...colIssues.map((ci) => ci.message), col.comment].filter(Boolean).join("\n")
                    : col.comment
                }
              >
                {/* left connection handle */}
                <Handle
                  side="left"
                  onPointerDown={(e) => onHandlePointerDown(e, table.id, col.id)}
                />

                {/* column type icon */}
                <span className="flex w-4 justify-center text-muted-foreground">
                  {col.isPrimary ? (
                    <KeyRound className="h-3 w-3 text-amber-500" />
                  ) : col.isUnique ? (
                    <Hash className="h-3 w-3 text-sky-500" />
                  ) : (
                    <Link2 className="h-3 w-3 opacity-0" />
                  )}
                </span>

                {/* column name */}
                <span
                  className={cn(
                    "flex-1 truncate font-medium",
                    col.isPrimary && "text-foreground",
                    colHasError && "text-destructive",
                  )}
                >
                  {col.name || <em className="opacity-50">unnamed</em>}
                  {!col.isNullable && <span className="text-destructive"> *</span>}
                </span>

                {/* column type */}
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {col.type}
                </span>

                {/* per-column issue indicator */}
                {colIssues.length > 0 && (
                  <span className="shrink-0">
                    {colHasError ? (
                      <AlertCircle className="h-3 w-3 text-destructive" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    )}
                  </span>
                )}

                {/* right connection handle */}
                <Handle
                  side="right"
                  onPointerDown={(e) => onHandlePointerDown(e, table.id, col.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

function Handle({
  side,
  onPointerDown,
}: {
  side: "left" | "right";
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <button
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown(e);
      }}
      className={cn(
        "absolute top-1/2 z-10 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-primary bg-background opacity-0 transition hover:scale-125 group-hover/row:opacity-70 hover:opacity-100!",
        side === "left" ? "-left-1.5" : "-right-1.5",
      )}
      style={side === "left" ? { left: -6 } : { right: -6 }}
      aria-label="Create relationship"
    />
  );
}
