export type Dialect = "postgres" | "mysql" | "sqlite";

export const COLUMN_TYPES = [
  "integer",
  "bigint",
  "serial",
  "uuid",
  "varchar",
  "text",
  "boolean",
  "timestamp",
  "date",
  "numeric",
  "json",
  "jsonb",
] as const;

export type ColumnType = (typeof COLUMN_TYPES)[number];

export interface Column {
  id: string;
  name: string;
  type: string;
  isPrimary: boolean;
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: string;
}

export const TABLE_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
] as const;

export interface Table {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  columns: Column[];
}

export type RelationKind = "1-1" | "1-n" | "n-n";

export interface Relationship {
  id: string;
  /** table holding the foreign key */
  sourceTableId: string;
  sourceColumnId: string;
  /** referenced table */
  targetTableId: string;
  targetColumnId: string;
  kind: RelationKind;
}

export interface Diagram {
  id: string;
  name: string;
  dialect: Dialect;
  tables: Table[];
  relationships: Relationship[];
}

export const TABLE_WIDTH = 256;
export const HEADER_HEIGHT = 42;
export const ROW_HEIGHT = 34;

export function tableHeight(t: Table): number {
  return HEADER_HEIGHT + t.columns.length * ROW_HEIGHT;
}
