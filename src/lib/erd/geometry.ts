import type { Diagram, Relationship, Table } from "./types";
import { HEADER_HEIGHT, ROW_HEIGHT, TABLE_WIDTH, tableHeight } from "./types";

export interface Point {
  x: number;
  y: number;
}

function columnY(table: Table, columnId: string): number {
  const idx = table.columns.findIndex((c) => c.id === columnId);
  const i = idx < 0 ? 0 : idx;
  return table.y + HEADER_HEIGHT + i * ROW_HEIGHT + ROW_HEIGHT / 2;
}

/** Returns a smooth path + endpoints for a relationship. */
export function relationshipPath(
  diagram: Diagram,
  rel: Relationship,
): { path: string; from: Point; to: Point; mid: Point } | null {
  const source = diagram.tables.find((t) => t.id === rel.sourceTableId);
  const target = diagram.tables.find((t) => t.id === rel.targetTableId);
  if (!source || !target) return null;

  const sY = columnY(source, rel.sourceColumnId);
  const tY = columnY(target, rel.targetColumnId);

  const sourceCenterX = source.x + TABLE_WIDTH / 2;
  const targetCenterX = target.x + TABLE_WIDTH / 2;

  const sourceRight = sourceCenterX < targetCenterX;
  const from: Point = {
    x: sourceRight ? source.x + TABLE_WIDTH : source.x,
    y: sY,
  };
  const to: Point = {
    x: sourceRight ? target.x : target.x + TABLE_WIDTH,
    y: tY,
  };

  const dx = Math.max(40, Math.abs(to.x - from.x) / 2);
  const c1: Point = { x: from.x + (sourceRight ? dx : -dx), y: from.y };
  const c2: Point = { x: to.x + (sourceRight ? -dx : dx), y: to.y };

  const path = `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
  const mid: Point = {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  };
  return { path, from, to, mid };
}

export function tableBounds(t: Table) {
  return { x: t.x, y: t.y, w: TABLE_WIDTH, h: tableHeight(t) };
}

export function diagramBounds(diagram: Diagram) {
  if (diagram.tables.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const t of diagram.tables) {
    const b = tableBounds(t);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { minX, minY, maxX, maxY };
}
