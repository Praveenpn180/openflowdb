import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { toPng } from "html-to-image";
import { Plus, Minus, Maximize2, MousePointer2 } from "lucide-react";
import { TableNode } from "./TableNode";
import { actions, useDiagram, useLayoutRevision, useSelectedTableId } from "@/lib/erd/store";
import { relationshipPath, diagramBounds } from "@/lib/erd/geometry";
import type { Point } from "@/lib/erd/geometry";
import { downloadDataUrl } from "@/lib/erd/io";
import { Button } from "@/components/ui/button";

interface Viewport {
  x: number;
  y: number;
  scale: number;
}

interface Pending {
  sourceTableId: string;
  sourceColumnId: string;
  from: Point;
  current: Point;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 2.5;

export type CanvasHandle = {
  exportPng: (filename: string) => Promise<void>;
};

export const Canvas = forwardRef<CanvasHandle>(function Canvas(_ref, ref) {
  const diagram = useDiagram();
  const selectedId = useSelectedTableId();
  const layoutRevision = useLayoutRevision();
  const containerRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [pending, setPending] = useState<Pending | null>(null);

  const dragState = useRef<{
    tableId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const panState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  );

  const toWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - vp.x) / vp.scale,
        y: (clientY - rect.top - vp.y) / vp.scale,
      };
    },
    [vp],
  );

  // ----- wheel zoom & pan -----
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setVp((prev) => {
      const delta = -e.deltaY;
      const factor = Math.exp(delta * 0.0015);
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      // keep point under cursor stable
      const wx = (px - prev.x) / prev.scale;
      const wy = (py - prev.y) / prev.scale;
      return {
        scale: nextScale,
        x: px - wx * nextScale,
        y: py - wy * nextScale,
      };
    });
  }, []);

  // ----- background pan -----
  const onBackgroundPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target !== e.currentTarget) return;
      actions.selectTable(null);
      panState.current = { startX: e.clientX, startY: e.clientY, origX: vp.x, origY: vp.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [vp.x, vp.y],
  );

  // ----- table drag -----
  const onHeaderPointerDown = useCallback(
    (e: React.PointerEvent, tableId: string) => {
      e.stopPropagation();
      const t = diagram.tables.find((tb) => tb.id === tableId);
      if (!t) return;
      actions.selectTable(tableId);
      dragState.current = {
        tableId,
        startX: e.clientX,
        startY: e.clientY,
        origX: t.x,
        origY: t.y,
      };
    },
    [diagram.tables],
  );

  // ----- relationship handle -----
  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent, tableId: string, columnId: string) => {
      const world = toWorld(e.clientX, e.clientY);
      setPending({ sourceTableId: tableId, sourceColumnId: columnId, from: world, current: world });
    },
    [toWorld],
  );

  // ----- global pointer move/up -----
  useEffect(() => {
    function move(e: PointerEvent) {
      if (dragState.current) {
        const d = dragState.current;
        const dx = (e.clientX - d.startX) / vp.scale;
        const dy = (e.clientY - d.startY) / vp.scale;
        actions.moveTable(d.tableId, Math.round(d.origX + dx), Math.round(d.origY + dy));
      } else if (panState.current) {
        const p = panState.current;
        setVp((prev) => ({
          ...prev,
          x: p.origX + (e.clientX - p.startX),
          y: p.origY + (e.clientY - p.startY),
        }));
      } else if (pending) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setPending((prev) =>
            prev
              ? {
                  ...prev,
                  current: {
                    x: (e.clientX - rect.left - vp.x) / vp.scale,
                    y: (e.clientY - rect.top - vp.y) / vp.scale,
                  },
                }
              : prev,
          );
        }
      }
    }

    function up(e: PointerEvent) {
      if (pending) {
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const row = el?.closest("[data-col-id]") as HTMLElement | null;
        if (row) {
          const targetTableId = row.getAttribute("data-table-id");
          const targetColumnId = row.getAttribute("data-col-id");
          if (
            targetTableId &&
            targetColumnId &&
            targetTableId !== pending.sourceTableId
          ) {
            actions.addRelationship({
              sourceTableId: pending.sourceTableId,
              sourceColumnId: pending.sourceColumnId,
              targetTableId,
              targetColumnId,
              kind: "1-n",
            });
          }
        }
        setPending(null);
      }
      dragState.current = null;
      panState.current = null;
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [vp.scale, vp.x, vp.y, pending]);

  const fitView = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const b = diagramBounds(diagram);
    const w = b.maxX - b.minX + 160;
    const h = b.maxY - b.minY + 160;
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(rect.width / w, rect.height / h)));
    setVp({
      scale,
      x: rect.width / 2 - ((b.minX + b.maxX) / 2) * scale,
      y: rect.height / 2 - ((b.minY + b.maxY) / 2) * scale,
    });
  }, [diagram]);

  useEffect(() => {
    if (layoutRevision === 0) return;
    fitView();
  }, [layoutRevision, fitView]);

  const exportPng = useCallback(
    async (filename: string) => {
      const container = containerRef.current;
      if (!container || diagram.tables.length === 0) {
        throw new Error("Nothing to export");
      }

      const previousVp = vp;
      fitView();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      try {
        const backgroundColor = getComputedStyle(container).backgroundColor;
        const dataUrl = await toPng(container, {
          pixelRatio: 2,
          backgroundColor,
          cacheBust: true,
          filter: (node) => {
            if (node instanceof HTMLElement && node.dataset.exportIgnore !== undefined) {
              return false;
            }
            return true;
          },
        });
        downloadDataUrl(dataUrl, filename);
      } finally {
        setVp(previousVp);
      }
    },
    [diagram.tables.length, fitView, vp],
  );

  useImperativeHandle(ref, () => ({ exportPng }), [exportPng]);

  const zoom = (dir: 1 | -1) => {
    setVp((prev) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * (dir === 1 ? 1.2 : 0.8)));
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { ...prev, scale: next };
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const wx = (cx - prev.x) / prev.scale;
      const wy = (cy - prev.y) / prev.scale;
      return { scale: next, x: cx - wx * next, y: cy - wy * next };
    });
  };

  const gridSize = 24 * vp.scale;

  return (
    <div
      ref={containerRef}
      onWheel={onWheel}
      onPointerDown={onBackgroundPointerDown}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) {
          const w = toWorld(e.clientX, e.clientY);
          actions.addTable({ x: Math.round(w.x), y: Math.round(w.y) });
        }
      }}
      className="relative h-full w-full overflow-hidden bg-canvas"
      style={{
        backgroundImage:
          "radial-gradient(var(--canvas-grid) 1px, transparent 1px)",
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${vp.x}px ${vp.y}px`,
        cursor: panState.current ? "grabbing" : "default",
      }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.scale})` }}
      >
        {/* relationships */}
        <svg
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
          style={{ width: 1, height: 1 }}
        >
          {diagram.relationships.map((rel) => {
            const p = relationshipPath(diagram, rel);
            if (!p) return null;
            return (
              <g key={rel.id} className="pointer-events-auto">
                <path
                  d={p.path}
                  fill="none"
                  className="stroke-muted-foreground/50"
                  strokeWidth={1.5}
                />
                <circle cx={p.from.x} cy={p.from.y} r={4} className="fill-primary" />
                <circle cx={p.to.x} cy={p.to.y} r={4} className="fill-background stroke-primary" strokeWidth={2} />
                <path
                  d={p.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  className="cursor-pointer"
                  onClick={() => actions.removeRelationship(rel.id)}
                >
                  <title>Click to delete relationship</title>
                </path>
              </g>
            );
          })}
          {pending && (
            <path
              d={`M ${pending.from.x} ${pending.from.y} L ${pending.current.x} ${pending.current.y}`}
              fill="none"
              className="stroke-primary"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
          )}
        </svg>

        {/* tables */}
        {diagram.tables.map((t) => (
          <TableNode
            key={t.id}
            table={t}
            selected={t.id === selectedId}
            connecting={!!pending}
            onHeaderPointerDown={onHeaderPointerDown}
            onSelect={actions.selectTable}
            onDelete={actions.removeTable}
            onHandlePointerDown={onHandlePointerDown}
          />
        ))}
      </div>

      {diagram.tables.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <MousePointer2 className="h-8 w-8" />
          <p className="text-sm font-medium">Double-click anywhere to add a table</p>
        </div>
      )}

      {/* zoom controls */}
      <div
        data-export-ignore
        className="absolute bottom-4 right-4 flex items-center gap-1 rounded-lg border bg-card/90 p-1 shadow-lg backdrop-blur"
      >
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoom(-1)}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center text-xs font-medium tabular-nums">
          {Math.round(vp.scale * 100)}%
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoom(1)}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fitView}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
