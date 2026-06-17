import { memo } from "react";
import { Trash2, KeyRound, Hash, Link2 } from "lucide-react";
import type { Table } from "@/lib/erd/types";
import { HEADER_HEIGHT, ROW_HEIGHT, TABLE_WIDTH } from "@/lib/erd/types";
import { cn } from "@/lib/utils";

interface Props {
  table: Table;
  selected: boolean;
  onHeaderPointerDown: (e: React.PointerEvent, tableId: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onHandlePointerDown: (
    e: React.PointerEvent,
    tableId: string,
    columnId: string,
  ) => void;
  connecting: boolean;
}

export const TableNode = memo(function TableNode({
  table,
  selected,
  onHeaderPointerDown,
  onSelect,
  onDelete,
  onHandlePointerDown,
  connecting,
}: Props) {
  return (
    <div
      data-table-id={table.id}
      onPointerDown={() => onSelect(table.id)}
      className={cn(
        "absolute select-none rounded-xl border bg-card shadow-lg transition-shadow",
        selected ? "ring-2 ring-primary" : "hover:shadow-xl",
      )}
      style={{ left: table.x, top: table.y, width: TABLE_WIDTH }}
    >
      {/* header */}
      <div
        onPointerDown={(e) => onHeaderPointerDown(e, table.id)}
        className="group flex cursor-grab items-center justify-between gap-2 rounded-t-xl px-3 active:cursor-grabbing"
        style={{ height: HEADER_HEIGHT, background: table.color }}
      >
        <span className="truncate text-sm font-semibold text-white">
          {table.name}
        </span>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(table.id);
          }}
          className="rounded p-1 text-white/70 opacity-0 transition hover:bg-black/20 hover:text-white group-hover:opacity-100"
          aria-label="Delete table"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* columns */}
      <div className="rounded-b-xl">
        {table.columns.map((col, i) => (
          <div
            key={col.id}
            data-col-id={col.id}
            data-table-id={table.id}
            className={cn(
              "group/row relative flex items-center gap-2 border-t border-border/60 px-3 text-xs",
              i === table.columns.length - 1 && "rounded-b-xl",
              connecting && "hover:bg-accent",
            )}
            style={{ height: ROW_HEIGHT }}
          >
            {/* left handle */}
            <Handle side="left" onPointerDown={(e) => onHandlePointerDown(e, table.id, col.id)} />
            <span className="flex w-4 justify-center text-muted-foreground">
              {col.isPrimary ? (
                <KeyRound className="h-3 w-3 text-amber-500" />
              ) : col.isUnique ? (
                <Hash className="h-3 w-3 text-sky-500" />
              ) : (
                <Link2 className="h-3 w-3 opacity-0" />
              )}
            </span>
            <span
              className={cn(
                "flex-1 truncate font-medium",
                col.isPrimary && "text-foreground",
              )}
            >
              {col.name}
              {!col.isNullable && <span className="text-destructive"> *</span>}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {col.type}
            </span>
            {/* right handle */}
            <Handle side="right" onPointerDown={(e) => onHandlePointerDown(e, table.id, col.id)} />
          </div>
        ))}
      </div>
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
        "absolute top-1/2 z-10 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-primary bg-background opacity-0 transition hover:scale-125 group-hover/row:opacity-70 hover:!opacity-100",
        side === "left" ? "-left-1.5" : "-right-1.5",
      )}
      style={side === "left" ? { left: -6 } : { right: -6 }}
      aria-label="Create relationship"
    />
  );
}
