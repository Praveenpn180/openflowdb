import type { Diagram, Table, Column, Relationship, Dialect } from "./types";

// ── Diff types ────────────────────────────────────────────────────────────────

export interface ColumnDiff {
  kind: "added" | "dropped" | "altered";
  column: Column;
  before?: Column; // for "altered"
}

export interface TableDiff {
  kind: "added" | "dropped" | "altered";
  table: Table;
  before?: Table; // for "altered"
  columnDiffs?: ColumnDiff[];
}

export interface RelationshipDiff {
  kind: "added" | "dropped";
  rel: Relationship;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

export interface MigrationDiff {
  tableDiffs: TableDiff[];
  relationshipDiffs: RelationshipDiff[];
}

// ── Core diff logic ───────────────────────────────────────────────────────────

export function diffDiagrams(before: Diagram, after: Diagram): MigrationDiff {
  const tableDiffs: TableDiff[] = [];
  const relationshipDiffs: RelationshipDiff[] = [];

  const beforeTablesByName = new Map(before.tables.map((t) => [t.name.toLowerCase(), t]));
  const afterTablesByName = new Map(after.tables.map((t) => [t.name.toLowerCase(), t]));

  // Added tables
  for (const [name, afterTable] of afterTablesByName) {
    if (!beforeTablesByName.has(name)) {
      tableDiffs.push({ kind: "added", table: afterTable });
    }
  }

  // Dropped tables
  for (const [name, beforeTable] of beforeTablesByName) {
    if (!afterTablesByName.has(name)) {
      tableDiffs.push({ kind: "dropped", table: beforeTable });
    }
  }

  // Altered tables (column-level diffs)
  for (const [name, afterTable] of afterTablesByName) {
    const beforeTable = beforeTablesByName.get(name);
    if (!beforeTable) continue;

    const columnDiffs = diffColumns(beforeTable.columns, afterTable.columns);
    if (columnDiffs.length > 0) {
      tableDiffs.push({ kind: "altered", table: afterTable, before: beforeTable, columnDiffs });
    }
  }

  // Relationship diffs — compare by column name pairs
  const relKey = (r: Relationship, tables: Table[]) => {
    const src = tables.find((t) => t.id === r.sourceTableId);
    const tgt = tables.find((t) => t.id === r.targetTableId);
    const srcCol = src?.columns.find((c) => c.id === r.sourceColumnId);
    const tgtCol = tgt?.columns.find((c) => c.id === r.targetColumnId);
    return `${src?.name}.${srcCol?.name}->${tgt?.name}.${tgtCol?.name}`;
  };

  const beforeRelKeys = new Map(before.relationships.map((r) => [relKey(r, before.tables), r]));
  const afterRelKeys = new Map(after.relationships.map((r) => [relKey(r, after.tables), r]));

  const resolveNames = (r: Relationship, tables: Table[]) => {
    const src = tables.find((t) => t.id === r.sourceTableId);
    const tgt = tables.find((t) => t.id === r.targetTableId);
    return {
      sourceTable: src?.name ?? "unknown",
      sourceColumn: src?.columns.find((c) => c.id === r.sourceColumnId)?.name ?? "unknown",
      targetTable: tgt?.name ?? "unknown",
      targetColumn: tgt?.columns.find((c) => c.id === r.targetColumnId)?.name ?? "unknown",
    };
  };

  for (const [key, afterRel] of afterRelKeys) {
    if (!beforeRelKeys.has(key)) {
      relationshipDiffs.push({
        kind: "added",
        rel: afterRel,
        ...resolveNames(afterRel, after.tables),
      });
    }
  }

  for (const [key, beforeRel] of beforeRelKeys) {
    if (!afterRelKeys.has(key)) {
      relationshipDiffs.push({
        kind: "dropped",
        rel: beforeRel,
        ...resolveNames(beforeRel, before.tables),
      });
    }
  }

  return { tableDiffs, relationshipDiffs };
}

function diffColumns(before: Column[], after: Column[]): ColumnDiff[] {
  const diffs: ColumnDiff[] = [];
  const beforeByName = new Map(before.map((c) => [c.name.toLowerCase(), c]));
  const afterByName = new Map(after.map((c) => [c.name.toLowerCase(), c]));

  for (const [name, afterCol] of afterByName) {
    const beforeCol = beforeByName.get(name);
    if (!beforeCol) {
      diffs.push({ kind: "added", column: afterCol });
    } else if (isColumnAltered(beforeCol, afterCol)) {
      diffs.push({ kind: "altered", column: afterCol, before: beforeCol });
    }
  }

  for (const [name, beforeCol] of beforeByName) {
    if (!afterByName.has(name)) {
      diffs.push({ kind: "dropped", column: beforeCol });
    }
  }

  return diffs;
}

function isColumnAltered(before: Column, after: Column): boolean {
  return (
    before.type !== after.type ||
    before.isNullable !== after.isNullable ||
    before.isUnique !== after.isUnique ||
    before.isPrimary !== after.isPrimary ||
    (before.defaultValue ?? "") !== (after.defaultValue ?? "")
  );
}

// ── SQL generation ────────────────────────────────────────────────────────────

function q(name: string, dialect: Dialect): string {
  return dialect === "mysql" ? `\`${name}\`` : `"${name}"`;
}

function pgType(col: Column, dialect: Dialect): string {
  const t = col.type.toLowerCase();
  if (dialect === "mysql") {
    const map: Record<string, string> = {
      serial: "INT AUTO_INCREMENT",
      uuid: "CHAR(36)",
      varchar: "VARCHAR(255)",
      boolean: "TINYINT(1)",
      timestamp: "DATETIME",
      jsonb: "JSON",
      numeric: "DECIMAL(10,2)",
      integer: "INT",
      bigint: "BIGINT",
    };
    return map[t] ?? t.toUpperCase();
  }
  if (dialect === "sqlite") {
    const map: Record<string, string> = {
      serial: "INTEGER",
      uuid: "TEXT",
      varchar: "TEXT",
      boolean: "INTEGER",
      timestamp: "TEXT",
      jsonb: "TEXT",
      json: "TEXT",
      numeric: "REAL",
      bigint: "INTEGER",
    };
    return map[t] ?? t.toUpperCase();
  }
  const map: Record<string, string> = {
    varchar: "VARCHAR(255)",
    numeric: "NUMERIC(10,2)",
  };
  return map[t] ?? t.toUpperCase();
}

export function generateAlterSql(diff: MigrationDiff, dialect: Dialect): string {
  if (diff.tableDiffs.length === 0 && diff.relationshipDiffs.length === 0) {
    return "-- No differences found between the two versions.";
  }

  const lines: string[] = [
    `-- Migration diff generated by OpenFlowDB (${dialect})`,
    `-- Apply these statements in order\n`,
  ];

  for (const td of diff.tableDiffs) {
    const tName = q(td.table.name, dialect);

    if (td.kind === "dropped") {
      lines.push(`DROP TABLE IF EXISTS ${tName};\n`);
      continue;
    }

    if (td.kind === "added") {
      const cols = td.table.columns.map((c) => {
        const parts = [q(c.name, dialect), pgType(c, dialect)];
        if (!c.isNullable) parts.push("NOT NULL");
        if (c.isUnique && !c.isPrimary) parts.push("UNIQUE");
        if (c.defaultValue) parts.push(`DEFAULT ${c.defaultValue}`);
        return "  " + parts.join(" ");
      });

      const pks = td.table.columns.filter((c) => c.isPrimary);
      if (pks.length > 0) {
        cols.push(`  PRIMARY KEY (${pks.map((c) => q(c.name, dialect)).join(", ")})`);
      }

      lines.push(`CREATE TABLE ${tName} (\n${cols.join(",\n")}\n);\n`);
      continue;
    }

    // Altered
    if (td.columnDiffs) {
      for (const cd of td.columnDiffs) {
        const cName = q(cd.column.name, dialect);

        if (cd.kind === "dropped") {
          lines.push(`ALTER TABLE ${tName} DROP COLUMN ${cName};\n`);
        } else if (cd.kind === "added") {
          const parts = [pgType(cd.column, dialect)];
          if (!cd.column.isNullable) parts.push("NOT NULL");
          if (cd.column.isUnique && !cd.column.isPrimary) parts.push("UNIQUE");
          if (cd.column.defaultValue) parts.push(`DEFAULT ${cd.column.defaultValue}`);
          lines.push(`ALTER TABLE ${tName} ADD COLUMN ${cName} ${parts.join(" ")};\n`);
        } else if (cd.kind === "altered" && cd.before) {
          // Type change
          if (cd.before.type !== cd.column.type) {
            if (dialect === "postgres") {
              lines.push(
                `ALTER TABLE ${tName} ALTER COLUMN ${cName} TYPE ${pgType(cd.column, dialect)} USING ${cName}::${pgType(cd.column, dialect)};\n`,
              );
            } else {
              lines.push(
                `ALTER TABLE ${tName} MODIFY COLUMN ${cName} ${pgType(cd.column, dialect)};\n`,
              );
            }
          }
          // Nullable change
          if (cd.before.isNullable !== cd.column.isNullable) {
            if (dialect === "postgres") {
              lines.push(
                `ALTER TABLE ${tName} ALTER COLUMN ${cName} ${cd.column.isNullable ? "DROP NOT NULL" : "SET NOT NULL"};\n`,
              );
            }
          }
          // Default change
          if ((cd.before.defaultValue ?? "") !== (cd.column.defaultValue ?? "")) {
            if (dialect === "postgres") {
              if (cd.column.defaultValue) {
                lines.push(
                  `ALTER TABLE ${tName} ALTER COLUMN ${cName} SET DEFAULT ${cd.column.defaultValue};\n`,
                );
              } else {
                lines.push(`ALTER TABLE ${tName} ALTER COLUMN ${cName} DROP DEFAULT;\n`);
              }
            }
          }
        }
      }
    }
  }

  // Relationship diffs → FK constraints
  for (const rd of diff.relationshipDiffs) {
    const srcTable = q(rd.sourceTable, dialect);
    const srcCol = q(rd.sourceColumn, dialect);
    const tgtTable = q(rd.targetTable, dialect);
    const tgtCol = q(rd.targetColumn, dialect);
    const constraintName = `fk_${rd.sourceTable}_${rd.sourceColumn}`.replace(/[^a-z0-9_]/gi, "_");

    if (rd.kind === "added") {
      if (dialect === "mysql") {
        lines.push(
          `ALTER TABLE ${srcTable} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${srcCol}) REFERENCES ${tgtTable} (${tgtCol});\n`,
        );
      } else {
        lines.push(
          `ALTER TABLE ${srcTable} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${srcCol}) REFERENCES ${tgtTable} (${tgtCol});\n`,
        );
      }
    } else {
      if (dialect === "mysql") {
        lines.push(`ALTER TABLE ${srcTable} DROP FOREIGN KEY ${constraintName};\n`);
      } else {
        lines.push(`ALTER TABLE ${srcTable} DROP CONSTRAINT IF EXISTS ${constraintName};\n`);
      }
    }
  }

  return lines.join("\n");
}
