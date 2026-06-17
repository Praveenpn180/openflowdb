import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "d3-force";

import type { Diagram, Relationship, Table } from "./types";
import { TABLE_WIDTH, tableHeight } from "./types";

const GRID_COLS = 3;
const GRID_COL_W = 340;
const GRID_ROW_H = 320;
const GRID_ORIGIN_X = 80;
const GRID_ORIGIN_Y = 80;

interface SimNode {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

function gridLayout(tables: Table[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  tables.forEach((table, index) => {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    positions.set(table.id, {
      x: GRID_ORIGIN_X + col * GRID_COL_W,
      y: GRID_ORIGIN_Y + row * GRID_ROW_H,
    });
  });
  return positions;
}

function forceLayout(
  tables: Table[],
  relationships: Relationship[],
): Map<string, { x: number; y: number }> {
  if (tables.length === 1) {
    return new Map([[tables[0].id, { x: GRID_ORIGIN_X, y: GRID_ORIGIN_Y }]]);
  }

  const nodes: SimNode[] = tables.map((table) => {
    const height = tableHeight(table);
    return {
      id: table.id,
      width: TABLE_WIDTH,
      height,
      x: table.x + TABLE_WIDTH / 2,
      y: table.y + height / 2,
    };
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const links = relationships
    .filter(
      (rel) => nodeById.has(rel.sourceTableId) && nodeById.has(rel.targetTableId),
    )
    .map((rel) => ({
      source: nodeById.get(rel.sourceTableId)!,
      target: nodeById.get(rel.targetTableId)!,
    }));

  const simulation = forceSimulation(nodes)
    .force(
      "link",
      forceLink<SimNode, (typeof links)[number]>(links)
        .id((node: SimNode) => node.id)
        .distance(300)
        .strength(links.length > 0 ? 0.7 : 0),
    )
    .force("charge", forceManyBody().strength(-1400))
    .force("center", forceCenter(0, 0).strength(0.08))
    .force(
      "collide",
      forceCollide<SimNode>()
        .radius((node: SimNode) => Math.hypot(node.width / 2, node.height / 2) + 28)
        .strength(0.95)
        .iterations(3),
    )
    .stop();

  const iterations = Math.min(450, 80 + tables.length * 35);
  for (let i = 0; i < iterations; i++) {
    simulation.tick();
  }

  let minX = Infinity;
  let minY = Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x - node.width / 2);
    minY = Math.min(minY, node.y - node.height / 2);
  }

  const offsetX = GRID_ORIGIN_X - minX;
  const offsetY = GRID_ORIGIN_Y - minY;
  const positions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    positions.set(node.id, {
      x: Math.round(node.x - node.width / 2 + offsetX),
      y: Math.round(node.y - node.height / 2 + offsetY),
    });
  }
  return positions;
}

export function autoLayoutDiagram(diagram: Diagram): Diagram {
  if (diagram.tables.length === 0) return diagram;

  const positions =
    diagram.relationships.length === 0
      ? gridLayout(diagram.tables)
      : forceLayout(diagram.tables, diagram.relationships);

  return {
    ...diagram,
    tables: diagram.tables.map((table) => {
      const position = positions.get(table.id);
      return position ? { ...table, x: position.x, y: position.y } : table;
    }),
  };
}
