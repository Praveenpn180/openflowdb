import { Plus, Trash2, KeyRound } from "lucide-react";
import { actions, useDiagram, useSelectedTableId } from "@/lib/erd/store";
import { COLUMN_TYPES, TABLE_COLORS } from "@/lib/erd/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Inspector() {
  const diagram = useDiagram();
  const selectedId = useSelectedTableId();
  const table = diagram.tables.find((t) => t.id === selectedId);

  if (!table) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">No table selected</p>
        <p className="text-xs text-muted-foreground">
          Select a table to edit its columns, or double-click the canvas to add one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
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
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Columns
        </h3>
        <Button size="sm" variant="outline" onClick={() => actions.addColumn(table.id)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-6">
        {table.columns.map((col) => (
          <div key={col.id} className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Input
                value={col.name}
                onChange={(e) => actions.updateColumn(table.id, col.id, { name: e.target.value })}
                className="h-8 text-sm"
                placeholder="column_name"
              />
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
              onChange={(e) => actions.updateColumn(table.id, col.id, { type: e.target.value })}
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
          </div>
        ))}
      </div>
    </div>
  );
}

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
