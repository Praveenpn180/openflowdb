import type { Diagram, Dialect, Table, Column } from "./types";

function typeFor(col: Column, table: Table, dialect: Dialect): string {
  const type = col.type;
  if (col.type === "enum") {
    if (dialect === "postgres") {
      return `"${table.name}_${col.name}_enum"`;
    }
    if (dialect === "mysql") {
      const valList = (col.values || []).map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
      return valList ? `ENUM(${valList})` : "VARCHAR(255)";
    }
    return "TEXT"; // SQLite
  }

  const t = type.toLowerCase().trim();
  const match = t.match(/^([a-z0-9_]+)(?:\s*\(([^)]+)\))?$/);
  if (!match) return type.toUpperCase();

  const base = match[1];
  const params = match[2]; // e.g. "255" or "10,2"

  if (dialect === "mysql") {
    const map: Record<string, string> = {
      serial: "INT AUTO_INCREMENT",
      uuid: "CHAR(36)",
      varchar: params ? `VARCHAR(${params})` : "VARCHAR(255)",
      text: "TEXT",
      boolean: "TINYINT(1)",
      timestamp: "DATETIME",
      jsonb: "JSON",
      numeric: params ? `DECIMAL(${params})` : "DECIMAL(10,2)",
      integer: "INT",
      bigint: "BIGINT",
    };
    return map[base] ?? type.toUpperCase();
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
    return map[base] ?? type.toUpperCase();
  }
  // postgres
  const map: Record<string, string> = {
    varchar: params ? `VARCHAR(${params})` : "VARCHAR(255)",
    numeric: params ? `NUMERIC(${params})` : "NUMERIC(10,2)",
  };
  return map[base] ?? type.toUpperCase();
}

function quote(name: string, dialect: Dialect): string {
  if (dialect === "mysql") return `\`${name}\``;
  return `"${name}"`;
}

function columnLine(col: Column, table: Table, dialect: Dialect): string {
  const parts: string[] = [quote(col.name, dialect), typeFor(col, table, dialect)];
  if (!col.isNullable) parts.push("NOT NULL");
  if (col.isUnique && !col.isPrimary) parts.push("UNIQUE");
  if (col.defaultValue) parts.push(`DEFAULT ${col.defaultValue}`);
  if (dialect === "mysql" && col.comment) {
    parts.push(`COMMENT '${col.comment.replace(/'/g, "''")}'`);
  }
  let line = "  " + parts.join(" ");
  if (dialect === "sqlite" && col.comment) {
    line += ` -- ${col.comment.replace(/\n/g, " ")}`;
  }
  return line;
}

export function tableSql(table: Table, diagram: Diagram): string {
  const dialect = diagram.dialect;
  const lines: string[] = table.columns.map((c) => columnLine(c, table, dialect));

  const pks = table.columns.filter((c) => c.isPrimary);
  if (pks.length > 0) {
    lines.push(`  PRIMARY KEY (${pks.map((c) => quote(c.name, dialect)).join(", ")})`);
  }

  // foreign keys where this table is the source
  const fks = diagram.relationships.filter((r) => r.sourceTableId === table.id);
  for (const fk of fks) {
    const targetTable = diagram.tables.find((t) => t.id === fk.targetTableId);
    const sourceCol = table.columns.find((c) => c.id === fk.sourceColumnId);
    const targetCol = targetTable?.columns.find((c) => c.id === fk.targetColumnId);
    if (targetTable && sourceCol && targetCol) {
      lines.push(
        `  FOREIGN KEY (${quote(sourceCol.name, dialect)}) REFERENCES ${quote(
          targetTable.name,
          dialect,
        )} (${quote(targetCol.name, dialect)})`,
      );
    }
  }

  let tableOptions = "";
  if (dialect === "mysql" && table.description) {
    tableOptions = ` COMMENT = '${table.description.replace(/'/g, "''")}'`;
  }

  const createTable = `CREATE TABLE ${quote(table.name, dialect)} (\n${lines.join(",\n")}\n)${tableOptions};`;

  let sqliteHeader = "";
  if (dialect === "sqlite" && table.description) {
    sqliteHeader = `-- Table: ${table.name}\n-- Description: ${table.description.replace(/\n/g, "\n-- ")}\n`;
  }

  let pgComments = "";
  if (dialect === "postgres") {
    const commentsList: string[] = [];
    if (table.description) {
      commentsList.push(`COMMENT ON TABLE ${quote(table.name, dialect)} IS '${table.description.replace(/'/g, "''")}';`);
    }
    for (const col of table.columns) {
      if (col.comment) {
        commentsList.push(`COMMENT ON COLUMN ${quote(table.name, dialect)}.${quote(col.name, dialect)} IS '${col.comment.replace(/'/g, "''")}';`);
      }
    }
    if (commentsList.length > 0) {
      pgComments = "\n" + commentsList.join("\n");
    }
  }

  // Standalone Indexes
  let indexStatements = "";
  if (table.indexes && table.indexes.length > 0) {
    const list = table.indexes.map((idx) => {
      const colNames = idx.columnIds
        .map((cid) => table.columns.find((c) => c.id === cid)?.name)
        .filter(Boolean)
        .map((name) => quote(name!, dialect));
      if (colNames.length === 0) return "";
      const uniqueStr = idx.isUnique ? "UNIQUE " : "";
      return `CREATE ${uniqueStr}INDEX ${quote(idx.name, dialect)} ON ${quote(table.name, dialect)} (${colNames.join(", ")});`;
    }).filter(Boolean);
    if (list.length > 0) {
      indexStatements = "\n" + list.join("\n");
    }
  }

  return sqliteHeader + createTable + pgComments + indexStatements;
}

export function generateSql(diagram: Diagram): string {
  if (diagram.tables.length === 0) {
    return "-- Add a table to generate SQL";
  }
  const header = `-- ${diagram.name}\n-- Generated by OpenFlowDB (${diagram.dialect})\n`;

  // Assemble custom types for Postgres
  let customTypes = "";
  if (diagram.dialect === "postgres") {
    const enumTypes: string[] = [];
    diagram.tables.forEach((t) => {
      t.columns.forEach((c) => {
        if (c.type === "enum" && c.values && c.values.length > 0) {
          const typeName = `${t.name}_${c.name}_enum`;
          const valList = c.values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
          enumTypes.push(`CREATE TYPE "${typeName}" AS ENUM (${valList});`);
        }
      });
    });
    if (enumTypes.length > 0) {
      customTypes = enumTypes.join("\n") + "\n\n";
    }
  }

  const body = diagram.tables.map((t) => tableSql(t, diagram)).join("\n\n");
  return `${header}\n${customTypes}${body}\n`;
}
