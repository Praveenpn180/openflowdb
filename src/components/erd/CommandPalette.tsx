import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Network,
  Sparkles,
  Eraser,
  Code2,
  Undo2,
  Redo2,
  Database,
  Download,
  Upload,
  AlertCircle,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { actions, useCanRedo, useCanUndo, useDiagram, useSelectedTableIds } from "@/lib/erd/store";
import { validateDiagram, diagramIssueSummary } from "@/lib/erd/validation";
import { TABLE_COLORS } from "@/lib/erd/types";
import type { CanvasHandle } from "./Canvas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasRef: React.RefObject<CanvasHandle | null>;
  onShowSql: () => void;
  onImport: () => void;
}

export function CommandPalette({ open, onOpenChange, canvasRef, onShowSql, onImport }: Props) {
  const diagram = useDiagram();
  const selectedIds = useSelectedTableIds();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  const issues = validateDiagram(diagram);
  const { errors, warnings } = diagramIssueSummary(issues);
  const hasSelection = selectedIds.size > 0;

  const run = useCallback(
    (fn: () => void) => {
      onOpenChange(false);
      // small delay so the dialog closes before the action fires
      setTimeout(fn, 50);
    },
    [onOpenChange],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* ---- diagram ---- */}
        <CommandGroup heading="Diagram">
          <CommandItem onSelect={() => run(() => actions.addTable())}>
            <Plus />
            Add Table
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => actions.autoLayout())}>
            <Network />
            Auto Layout
            <CommandShortcut>⌘L</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => canvasRef.current?.fitView())}>
            <Database />
            Fit View
            <CommandShortcut>⌘0</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => { onShowSql(); })}>
            <Code2 />
            Generate SQL
            <CommandShortcut>⌘G</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => canvasRef.current?.exportPng(diagram.name || "diagram"))}>
            <Download />
            Export PNG
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* ---- history ---- */}
        <CommandGroup heading="History">
          <CommandItem
            onSelect={() => run(() => actions.undo())}
            disabled={!canUndo}
          >
            <Undo2 />
            Undo
            <CommandShortcut>⌘Z</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => run(() => actions.redo())}
            disabled={!canRedo}
          >
            <Redo2 />
            Redo
            <CommandShortcut>⌘⇧Z</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* ---- import / sample ---- */}
        <CommandGroup heading="File">
          <CommandItem onSelect={() => run(() => onImport())}>
            <Upload />
            Import SQL
          </CommandItem>
          <CommandItem onSelect={() => run(() => actions.loadSample())}>
            <Sparkles />
            Load Sample Diagram
          </CommandItem>
          <CommandItem onSelect={() => run(() => actions.clearAll())}>
            <Eraser />
            Clear Diagram
          </CommandItem>
        </CommandGroup>

        {/* ---- bulk selection ---- */}
        {hasSelection && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Selection (${selectedIds.size} table${selectedIds.size > 1 ? "s" : ""})`}>
              <CommandItem
                onSelect={() =>
                  run(() => actions.bulkDeleteTables([...selectedIds]))
                }
              >
                <Trash2 />
                Delete Selected
                <CommandShortcut>Del</CommandShortcut>
              </CommandItem>
              {TABLE_COLORS.map((color) => (
                <CommandItem
                  key={color}
                  onSelect={() =>
                    run(() => actions.bulkRecolorTables([...selectedIds], color))
                  }
                >
                  <span
                    className="h-4 w-4 rounded-full border"
                    style={{ background: color }}
                  />
                  Recolor Selected
                  <CommandShortcut style={{ color }}>{color}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* ---- validation issues ---- */}
        {(errors > 0 || warnings > 0) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Schema Issues">
              {[...issues.entries()].flatMap(([tableId, tableIssues]) => {
                const table = diagram.tables.find((t) => t.id === tableId);
                if (!table) return [];
                return tableIssues.map((issue) => (
                  <CommandItem
                    key={`${tableId}-${issue.code}-${issue.columnId ?? ""}`}
                    onSelect={() =>
                      run(() => {
                        actions.selectTable(tableId);
                      })
                    }
                  >
                    {issue.severity === "error" ? (
                      <AlertCircle className="text-destructive" />
                    ) : (
                      <AlertTriangle className="text-amber-500" />
                    )}
                    <span className="truncate">
                      <span className="font-medium">{table.name}</span>
                      {" — "}
                      {issue.message}
                    </span>
                  </CommandItem>
                ));
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
