import type { Column, Diagram, Relationship, Table } from "./types";
import { TABLE_COLORS } from "./types";
import { uid } from "./factory";

export interface ParseResult {
  diagram: Diagram | null;
  errors: string[];
}

interface PendingFk {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

function stripComments(sql: string): string {
  // remove -- line comments and /* */ block comments
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "");
}

function unquote(id: string): string {
  return id.trim().replace(/^["`\[]+|["`\]]+$/g, "");
}

function normalizeType(raw: string): string {
  const t = raw.toLowerCase().trim();
  const base = t.replace(/\(.*\)/, "").trim();
  const map: Record<string, string> = {
    int: "integer",
    int4: "integer",
    int8: "bigint",
    smallint: "integer",
    serial: "serial",
    bigserial: "serial",
    "character varying": "varchar",
    char: "varchar",
    "varchar2": "varchar",
    string: "varchar",
    "double precision": "numeric",
    double: "numeric",
    float: "numeric",
    real: "numeric",
    decimal: "numeric",
    bool: "boolean",
    tinyint: "boolean",
    datetime: "timestamp",
    timestamptz: "timestamp",
    "timestamp without time zone": "timestamp",
    "timestamp with time zone": "timestamp",
  };
  return map[base] ?? base;
}

// split top-level by commas, respecting parentheses
function splitColumns(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

const CONSTRAINT_KEYWORDS = /^(primary|unique|foreign|constraint|key|check|index)\b/i;

export function parseSql(sql: string): ParseResult {
  const errors: string[] = [];
  const cleaned = stripComments(sql);

  const tableHeadRegex =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?([`"\[\]\w.]+)\s*\(/gi;

  const tables: Table[] = [];
  const pendingFks: PendingFk[] = [];
  const tableNameToId = new Map<string, string>();

  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = tableHeadRegex.exec(cleaned)) !== null) {
    const rawName = unquote(match[1]).split(".").pop() ?? match[1];
    // extract the body using balanced parentheses starting at the opening paren
    const start = tableHeadRegex.lastIndex; // char right after "("
    let depth = 1;
    let i = start;
    for (; i < cleaned.length && depth > 0; i++) {
      const ch = cleaned[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
    }
    if (depth !== 0) {
      errors.push(`Unbalanced parentheses for table "${rawName}".`);
      continue;
    }
    const body = cleaned.slice(start, i - 1);
    tableHeadRegex.lastIndex = i;
    const id = uid("tbl");
    tableNameToId.set(rawName.toLowerCase(), id);

    const columns: Column[] = [];
    const inlinePk: string[] = [];

    for (const rawDef of splitColumns(body)) {
      const def = rawDef.trim();
      if (!def) continue;

      if (CONSTRAINT_KEYWORDS.test(def)) {
        // table-level constraint
        const pk = def.match(/primary\s+key\s*\(([^)]+)\)/i);
        if (pk) {
          pk[1].split(",").forEach((c) => inlinePk.push(unquote(c).toLowerCase()));
        }
        const uq = def.match(/unique\s*\(([^)]+)\)/i);
        if (uq) {
          // mark columns unique later
          uq[1].split(",").forEach((c) => {
            const name = unquote(c).toLowerCase();
            const col = columns.find((x) => x.name.toLowerCase() === name);
            if (col) col.isUnique = true;
          });
        }
        const fk = def.match(
          /foreign\s+key\s*\(([^)]+)\)\s*references\s+([`"\[\]\w.]+)\s*\(([^)]+)\)/i,
        );
        if (fk) {
          pendingFks.push({
            sourceTable: rawName.toLowerCase(),
            sourceColumn: unquote(fk[1].split(",")[0]).toLowerCase(),
            targetTable: (unquote(fk[2]).split(".").pop() ?? "").toLowerCase(),
            targetColumn: unquote(fk[3].split(",")[0]).toLowerCase(),
          });
        }
        continue;
      }

      // column definition: name type ...rest
      const tokens = def.match(/^([`"\[\]\w]+)\s+([\w]+(?:\s*\([^)]*\))?(?:\s+(?:precision|varying|without time zone|with time zone))?)?(.*)$/i);
      if (!tokens) continue;
      const name = unquote(tokens[1]);
      const typeRaw = (tokens[2] ?? "varchar").trim();
      const rest = (tokens[3] ?? "").toLowerCase();

      const col: Column = {
        id: uid("col"),
        name,
        type: normalizeType(typeRaw),
        isPrimary: /primary\s+key/.test(rest),
        isNullable: !/not\s+null/.test(rest) && !/primary\s+key/.test(rest),
        isUnique: /\bunique\b/.test(rest),
      };
      const def2 = def.match(/default\s+([^,]+?)(?:\s+(?:not null|primary|unique|references|check)|$)/i);
      if (def2) col.defaultValue = def2[1].trim();

      // inline references
      const inlineRef = rest.match(/references\s+([`"\[\]\w.]+)\s*(?:\(([^)]+)\))?/i);
      if (inlineRef) {
        const m2 = rest.match(/references\s+([`"\[\]\w.]+)\s*(?:\(([^)]+)\))?/i)!;
        pendingFks.push({
          sourceTable: rawName.toLowerCase(),
          sourceColumn: name.toLowerCase(),
          targetTable: (unquote(m2[1]).split(".").pop() ?? "").toLowerCase(),
          targetColumn: m2[2] ? unquote(m2[2].split(",")[0]).toLowerCase() : "id",
        });
      }

      columns.push(col);
    }

    // apply table-level pks
    for (const pkName of inlinePk) {
      const col = columns.find((c) => c.name.toLowerCase() === pkName);
      if (col) {
        col.isPrimary = true;
        col.isNullable = false;
      }
    }

    if (columns.length === 0) {
      errors.push(`Table "${rawName}" has no recognizable columns.`);
      continue;
    }

    const col = index % 3;
    const row = Math.floor(index / 3);
    tables.push({
      id,
      name: rawName,
      x: 80 + col * 340,
      y: 80 + row * 320,
      color: TABLE_COLORS[index % TABLE_COLORS.length],
      columns,
    });
    index++;
  }

  if (tables.length === 0) {
    errors.push("No CREATE TABLE statements found.");
    return { diagram: null, errors };
  }

  // resolve foreign keys
  const relationships: Relationship[] = [];
  const seenFk = new Set<string>();
  for (const fk of pendingFks) {
    const key = `${fk.sourceTable}.${fk.sourceColumn}->${fk.targetTable}.${fk.targetColumn}`;
    if (seenFk.has(key)) continue;
    seenFk.add(key);
    const sourceTable = tables.find((t) => t.name.toLowerCase() === fk.sourceTable);
    const targetTable = tables.find((t) => t.name.toLowerCase() === fk.targetTable);
    if (!sourceTable || !targetTable) continue;
    const sourceCol = sourceTable.columns.find(
      (c) => c.name.toLowerCase() === fk.sourceColumn,
    );
    const targetCol =
      targetTable.columns.find((c) => c.name.toLowerCase() === fk.targetColumn) ??
      targetTable.columns.find((c) => c.isPrimary);
    if (!sourceCol || !targetCol) continue;
    relationships.push({
      id: uid("rel"),
      sourceTableId: sourceTable.id,
      sourceColumnId: sourceCol.id,
      targetTableId: targetTable.id,
      targetColumnId: targetCol.id,
      kind: "1-n",
    });
  }

  const diagram: Diagram = {
    id: uid("diagram"),
    name: "Imported Schema",
    dialect: "postgres",
    tables,
    relationships,
  };

  return { diagram, errors };
}

export function mergeDiagrams(existing: Diagram, parsed: Diagram): Diagram {
  const mergedTables = parsed.tables.map((parsedTable) => {
    // Find matching existing table by name (case-insensitive)
    const existingTable = existing.tables.find(
      (t) => t.name.toLowerCase() === parsedTable.name.toLowerCase()
    );

    if (existingTable) {
      // Re-use table ID, coordinates, and color
      const tableId = existingTable.id;
      
      // Merge columns to preserve their IDs if names match
      const mergedColumns = parsedTable.columns.map((parsedCol) => {
        const existingCol = existingTable.columns.find(
          (c) => c.name.toLowerCase() === parsedCol.name.toLowerCase()
        );
        return existingCol
          ? { ...parsedCol, id: existingCol.id }
          : parsedCol;
      });

      return {
        ...parsedTable,
        id: tableId,
        x: existingTable.x,
        y: existingTable.y,
        color: existingTable.color,
        columns: mergedColumns,
      };
    }

    return parsedTable;
  });

  // Re-map relationships to use the merged table and column IDs
  const tableIdMap = new Map<string, string>(); // parsedTable.id -> mergedTable.id
  const columnIdMap = new Map<string, string>(); // parsedCol.id -> mergedCol.id

  parsed.tables.forEach((parsedTable, idx) => {
    const mergedTable = mergedTables[idx];
    tableIdMap.set(parsedTable.id, mergedTable.id);
    parsedTable.columns.forEach((parsedCol, cIdx) => {
      const mergedCol = mergedTable.columns[cIdx];
      columnIdMap.set(parsedCol.id, mergedCol.id);
    });
  });

  const mergedRelationships = parsed.relationships.map((rel) => {
    const sourceTableId = tableIdMap.get(rel.sourceTableId) || rel.sourceTableId;
    const sourceColumnId = columnIdMap.get(rel.sourceColumnId) || rel.sourceColumnId;
    const targetTableId = tableIdMap.get(rel.targetTableId) || rel.targetTableId;
    const targetColumnId = columnIdMap.get(rel.targetColumnId) || rel.targetColumnId;

    return {
      ...rel,
      sourceTableId,
      sourceColumnId,
      targetTableId,
      targetColumnId,
    };
  });

  return {
    ...parsed,
    id: existing.id,
    name: existing.name,
    dialect: existing.dialect, // preserve existing dialect
    tables: mergedTables,
    relationships: mergedRelationships,
  };
}

