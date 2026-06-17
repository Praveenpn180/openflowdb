import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import { toPng } from "html-to-image";
import { Plus, Minus, Maximize2, MousePointer2 } from "lucide-react";
import { TableNode } from "./TableNode";
import {
  actions,
  useDiagram,
  useLayoutRevision,
  useSelectedTableId,
  useSelectedTableIds,
} from "@/lib/erd/store";
import { relationshipPath, diagramBounds, tableBounds } from "@/lib/erd/geometry";
import type { Point } from "@/lib/erd/geometry";
import { downloadDataUrl } from "@/lib/erd/io";
import { Button } from "@/components/ui/button";
import type { RelationKind } from "@/lib/erd/types";
import { TABLE_WIDTH, HEADER_HEIGHT, ROW_HEIGHT } from "@/lib/erd/types";

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

interface Marquee {
  startX: number; // world coords
  startY: number;
  endX: number;
  endY: number;
}

/** Which relationship kind the user wants to create when dropping a connection. */
interface KindPicker {
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  screenX: number;
  screenY: number;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 2.5;

// ---- crow's-foot SVG marker paths ----
// Markers are drawn at the "to" end (target) of each relationship.
// We define <marker> elements in a <defs> block.

const MARKER_DEFS = (
  <defs>
    {/* 1-1 : single vertical bar */}
    <marker id="cf-1-1" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
      <line x1="4" y1="1" x2="4" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7" y1="1" x2="7" y2="9" stroke="currentColor" strokeWidth="1.5" />
    </marker>
    {/* 1-n : crow's foot (three lines fanning out) */}
    <marker id="cf-1-n" markerWidth="12" markerHeight="12" refX="8" refY="6" orient="auto">
      {/* base bar */}
      <line x1="3" y1="2" x2="3" y2="10" stroke="currentColor" strokeWidth="1.5" />
      {/* three fan lines */}
      <line x1="3" y1="6" x2="10" y2="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3" y1="6" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
    </marker>
    {/* n-n : crow's foot on both ends — we use two separate markers, one for each side */}
    <marker id="cf-n-n-end" markerWidth="12" markerHeight="12" refX="8" refY="6" orient="auto">
      <line x1="3" y1="2" x2="3" y2="10" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3" y1="6" x2="10" y2="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3" y1="6" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
    </marker>
    <marker
      id="cf-n-n-start"
      markerWidth="12"
      markerHeight="12"
      refX="4"
      refY="6"
      orient="auto-start-reverse"
    >
      <line x1="9" y1="2" x2="9" y2="10" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9" y1="6" x2="2" y2="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9" y1="6" x2="2" y2="6" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9" y1="6" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" />
    </marker>
    {/* 1-1 start: single bar at source */}
    <marker
      id="cf-1-1-start"
      markerWidth="10"
      markerHeight="10"
      refX="4"
      refY="5"
      orient="auto-start-reverse"
    >
      <line x1="3" y1="1" x2="3" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6" y1="1" x2="6" y2="9" stroke="currentColor" strokeWidth="1.5" />
    </marker>
  </defs>
);

function markerUrlForKind(kind: RelationKind, end: "start" | "end"): string {
  if (kind === "1-1") return end === "end" ? "url(#cf-1-1)" : "url(#cf-1-1-start)";
  if (kind === "1-n") return end === "end" ? "url(#cf-1-n)" : "none";
  // n-n
  return end === "end" ? "url(#cf-n-n-end)" : "url(#cf-n-n-start)";
}

// ---- kind picker label helpers ----
const KIND_LABELS: Record<RelationKind, string> = {
  "1-1": "One-to-One",
  "1-n": "One-to-Many",
  "n-n": "Many-to-Many",
};

export type CanvasHandle = {
  exportPng: (filename: string) => Promise<void>;
  fitView: () => void;
};

export const Canvas = forwardRef<CanvasHandle>(function Canvas(_props, ref) {
  const diagram = useDiagram();
  const selectedId = useSelectedTableId();
  const selectedIds = useSelectedTableIds();
  const layoutRevision = useLayoutRevision();
  const containerRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [pending, setPending] = useState<Pending | null>(null);
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const [kindPicker, setKindPicker] = useState<KindPicker | null>(null);

  const dragState = useRef<{
    tableId: string;
    /** ids of all tables being dragged together */
    dragIds: string[];
    startX: number;
    startY: number;
    /** original positions keyed by id */
    origPos: Record<string, { x: number; y: number }>;
    moved: boolean;
  } | null>(null);

  const panState = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const marqueeStartRef = useRef<{ worldX: number; worldY: number } | null>(null);

  // ---- coordinate helpers ----
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

  // ---- wheel zoom ----
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setVp((prev) => {
      const factor = Math.exp(-e.deltaY * 0.0015);
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const wx = (px - prev.x) / prev.scale;
      const wy = (py - prev.y) / prev.scale;
      return { scale: nextScale, x: px - wx * nextScale, y: py - wy * nextScale };
    });
  }, []);

  // ---- background pointer down: pan or marquee ----
  const onBackgroundPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.button !== 0) return;

      const world = toWorld(e.clientX, e.clientY);

      if (e.shiftKey) {
        // start marquee selection
        marqueeStartRef.current = { worldX: world.x, worldY: world.y };
        setMarquee({ startX: world.x, startY: world.y, endX: world.x, endY: world.y });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else {
        // deselect + pan
        actions.selectTable(null);
        panState.current = { startX: e.clientX, startY: e.clientY, origX: vp.x, origY: vp.y };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [toWorld, vp.x, vp.y],
  );

  // ---- table header pointer down: drag (single or multi) ----
  const onHeaderPointerDown = useCallback(
    (e: React.PointerEvent, tableId: string) => {
      e.stopPropagation();
      const t = diagram.tables.find((tb) => tb.id === tableId);
      if (!t) return;

      let dragIds: string[];
      if (e.shiftKey) {
        // toggle this table into the selection
        actions.toggleTableSelection(tableId);
        dragIds = [...selectedIds, tableId];
      } else if (selectedIds.has(tableId) && selectedIds.size > 1) {
        // dragging within an existing multi-select — keep the whole set
        dragIds = [...selectedIds];
      } else {
        actions.selectTable(tableId);
        dragIds = [tableId];
      }

      const origPos: Record<string, { x: number; y: number }> = {};
      for (const id of dragIds) {
        const tb = diagram.tables.find((tb) => tb.id === id);
        if (tb) origPos[id] = { x: tb.x, y: tb.y };
      }

      dragState.current = {
        tableId,
        dragIds,
        startX: e.clientX,
        startY: e.clientY,
        origPos,
        moved: false,
      };
    },
    [diagram.tables, selectedIds],
  );

  // ---- relationship handle pointer down ----
  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent, tableId: string, columnId: string) => {
      const world = toWorld(e.clientX, e.clientY);
      setPending({ sourceTableId: tableId, sourceColumnId: columnId, from: world, current: world });
    },
    [toWorld],
  );

  // ---- global pointer move/up ----
  useEffect(() => {
    function move(e: PointerEvent) {
      if (dragState.current) {
        const d = dragState.current;
        const dx = (e.clientX - d.startX) / vp.scale;
        const dy = (e.clientY - d.startY) / vp.scale;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) d.moved = true;
        if (d.dragIds.length === 1) {
          const orig = d.origPos[d.tableId];
          actions.moveTable(d.tableId, Math.round(orig.x + dx), Math.round(orig.y + dy));
        } else {
          // bulk move: recompute each position from its original
          for (const id of d.dragIds) {
            const orig = d.origPos[id];
            if (orig) {
              actions.moveTable(id, Math.round(orig.x + dx), Math.round(orig.y + dy));
            }
          }
        }
      } else if (panState.current) {
        const p = panState.current;
        setVp((prev) => ({
          ...prev,
          x: p.origX + (e.clientX - p.startX),
          y: p.origY + (e.clientY - p.startY),
        }));
      } else if (marqueeStartRef.current) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const world = {
          x: (e.clientX - rect.left - vp.x) / vp.scale,
          y: (e.clientY - rect.top - vp.y) / vp.scale,
        };
        setMarquee({
          startX: marqueeStartRef.current.worldX,
          startY: marqueeStartRef.current.worldY,
          endX: world.x,
          endY: world.y,
        });
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
      if (dragState.current) {
        if (dragState.current.moved) actions.commitMove();
        dragState.current = null;
      }

      if (marqueeStartRef.current) {
        // compute which tables fall inside the marquee rect
        setMarquee((m) => {
          if (!m) return null;
          const minX = Math.min(m.startX, m.endX);
          const maxX = Math.max(m.startX, m.endX);
          const minY = Math.min(m.startY, m.endY);
          const maxY = Math.max(m.startY, m.endY);
          const hitIds: string[] = [];
          for (const t of diagram.tables) {
            const b = tableBounds(t);
            if (b.x < maxX && b.x + b.w > minX && b.y < maxY && b.y + b.h > minY) {
              hitIds.push(t.id);
            }
          }
          if (hitIds.length > 0) actions.setSelectedTableIds(hitIds);
          return null;
        });
        marqueeStartRef.current = null;
      }

      if (pending) {
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const row = el?.closest("[data-col-id]") as HTMLElement | null;
        if (row) {
          const targetTableId = row.getAttribute("data-table-id");
          const targetColumnId = row.getAttribute("data-col-id");
          if (targetTableId && targetColumnId && targetTableId !== pending.sourceTableId) {
            // show kind picker near drop point
            setKindPicker({
              sourceTableId: pending.sourceTableId,
              sourceColumnId: pending.sourceColumnId,
              targetTableId,
              targetColumnId,
              screenX: e.clientX,
              screenY: e.clientY,
            });
          }
        }
        setPending(null);
      }

      panState.current = null;
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [vp.scale, vp.x, vp.y, pending, diagram.tables]);

  // ---- dismiss kind picker on outside click ----
  useEffect(() => {
    if (!kindPicker) return;
    function dismiss(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-kind-picker]")) setKindPicker(null);
    }
    window.addEventListener("mousedown", dismiss);
    return () => window.removeEventListener("mousedown", dismiss);
  }, [kindPicker]);

  // ---- fitView ----
  const fitView = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const b = diagramBounds(diagram);
    const w = b.maxX - b.minX + 160;
    const h = b.maxY - b.minY + 160;
    const scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, Math.min(rect.width / w, rect.height / h)),
    );
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

  // ---- export PNG ----
  const exportPng = useCallback(
    async (filename: string) => {
      const container = containerRef.current;
      if (!container || diagram.tables.length === 0) throw new Error("Nothing to export");
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
            if (node instanceof HTMLElement && node.dataset.exportIgnore !== undefined) return false;
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

  useImperativeHandle(ref, () => ({ exportPng, fitView }), [exportPng, fitView]);

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

  // marquee screen-space rect for rendering
  const marqueeRect = marquee
    ? (() => {
        const toScreen = (wx: number, wy: number) => ({
          sx: wx * vp.scale + vp.x,
          sy: wy * vp.scale + vp.y,
        });
        const a = toScreen(marquee.startX, marquee.startY);
        const b = toScreen(marquee.endX, marquee.endY);
        return {
          left: Math.min(a.sx, b.sx),
          top: Math.min(a.sy, b.sy),
          width: Math.abs(b.sx - a.sx),
          height: Math.abs(b.sy - a.sy),
        };
      })()
    : null;

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
        backgroundImage: "radial-gradient(var(--canvas-grid) 1px, transparent 1px)",
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${vp.x}px ${vp.y}px`,
        cursor: panState.current ? "grabbing" : "default",
      }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.scale})` }}
      >
        {/* relationship SVG layer */}
        <svg
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
          style={{ width: 1, height: 1 }}
        >
          {MARKER_DEFS}
          {diagram.relationships.map((rel) => {
            const p = relationshipPath(diagram, rel);
            if (!p) return null;

            const endMarker = markerUrlForKind(rel.kind, "end");
            const startMarker = markerUrlForKind(rel.kind, "start");
            const useStartMarker = rel.kind === "1-1" || rel.kind === "n-n";

            return (
              <g key={rel.id} className="pointer-events-auto">
                {/* main line */}
                <path
                  d={p.path}
                  fill="none"
                  className="stroke-muted-foreground/60"
                  strokeWidth={1.5}
                  markerEnd={endMarker}
                  markerStart={useStartMarker ? startMarker : undefined}
                  style={{ color: "hsl(var(--muted-foreground))" }}
                />
                {/* relationship kind label at midpoint */}
                <text
                  x={p.mid.x}
                  y={p.mid.y - 6}
                  textAnchor="middle"
                  fontSize={10}
                  className="fill-muted-foreground select-none font-mono"
                >
                  {rel.kind}
                </text>
                {/* wide invisible hit-zone for click-to-delete */}
                <path
                  d={p.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  className="cursor-pointer"
                  onClick={() => actions.removeRelationship(rel.id)}
                >
                  <title>Click to delete · {rel.kind}</title>
                </path>
              </g>
            );
          })}
          {/* in-progress drag line */}
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

        {/* table nodes */}
        {diagram.tables.map((t) => (
          <TableNode
            key={t.id}
            table={t}
            selected={t.id === selectedId}
            multiSelected={selectedIds.has(t.id)}
            connecting={!!pending}
            onHeaderPointerDown={onHeaderPointerDown}
            onSelect={(id) => actions.selectTable(id)}
            onDelete={actions.removeTable}
            onHandlePointerDown={onHandlePointerDown}
          />
        ))}
      </div>

      {/* marquee selection overlay (screen-space) */}
      {marqueeRect && (
        <div
          data-export-ignore
          className="pointer-events-none absolute border border-primary/60 bg-primary/10"
          style={{
            left: marqueeRect.left,
            top: marqueeRect.top,
            width: marqueeRect.width,
            height: marqueeRect.height,
          }}
        />
      )}

      {/* relationship kind picker popup */}
      {kindPicker && (
        <KindPickerMenu
          picker={kindPicker}
          onPick={(kind) => {
            actions.addRelationship({
              sourceTableId: kindPicker.sourceTableId,
              sourceColumnId: kindPicker.sourceColumnId,
              targetTableId: kindPicker.targetTableId,
              targetColumnId: kindPicker.targetColumnId,
              kind,
            });
            setKindPicker(null);
          }}
          onDismiss={() => setKindPicker(null)}
        />
      )}

      {/* empty state hint */}
      {diagram.tables.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          <MousePointer2 className="h-8 w-8" />
          <p className="text-sm font-medium">Double-click anywhere to add a table</p>
          <p className="text-xs opacity-60">Shift-drag to marquee-select multiple tables</p>
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

// ---- KindPickerMenu ----

function KindPickerMenu({
  picker,
  onPick,
  onDismiss,
}: {
  picker: KindPicker;
  onPick: (kind: RelationKind) => void;
  onDismiss: () => void;
}) {
  const rect = document.getElementById("canvas-root")?.getBoundingClientRect();
  const left = picker.screenX;
  const top = picker.screenY;

  return (
    <div
      data-kind-picker
      data-export-ignore
      className="absolute z-50 rounded-lg border bg-card shadow-xl"
      style={{ left, top }}
    >
      <p className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
        Relationship type
      </p>
      {(["1-1", "1-n", "n-n"] as RelationKind[]).map((k) => (
        <button
          key={k}
          onClick={() => onPick(k)}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm transition hover:bg-accent"
        >
          <span className="w-8 font-mono text-xs text-muted-foreground">{k}</span>
          <span>{KIND_LABELS[k]}</span>
        </button>
      ))}
      <button
        onClick={onDismiss}
        className="w-full border-t px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted"
      >
        Cancel
      </button>
    </div>
  );
}
