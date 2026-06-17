import type { Diagram, Table } from "./types";

export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  /** Unique code for the rule that fired. */
  code: string;
  severity: IssueSeverity;
  /** Human-readable description. */
  message: string;
  /** If the issue is scoped to a column, its id. */
  columnId?: string;
}

export interface TableIssues {
  tableId: string;
  issues: ValidationIssue[];
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

function noPrimaryKey(table: Table): ValidationIssue | null {
  const hasPk = table.columns.some((c) => c.isPrimary);
  if (hasPk) return null;
  return {
    code: "NO_PRIMARY_KEY",
    severity: "error",
    message: "Table has no primary key column.",
  };
}

function duplicateColumnNames(table: Table): ValidationIssue[] {
  const seen = new Map<string, number>();
  for (const col of table.columns) {
    const key = col.name.trim().toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const issues: ValidationIssue[] = [];
  for (const col of table.columns) {
    const key = col.name.trim().toLowerCase();
    if ((seen.get(key) ?? 0) > 1) {
      issues.push({
        code: "DUPLICATE_COLUMN_NAME",
        severity: "error",
        message: `Duplicate column name "${col.name}".`,
        columnId: col.id,
      });
    }
  }
  return issues;
}

function emptyColumnName(table: Table): ValidationIssue[] {
  return table.columns
    .filter((c) => !c.name.trim())
    .map((c) => ({
      code: "EMPTY_COLUMN_NAME",
      severity: "error",
      message: "Column has no name.",
      columnId: c.id,
    }));
}

function orphanedForeignKey(diagram: Diagram, table: Table): ValidationIssue[] {
  // A column is "referenced" in a relationship when it is the sourceColumnId or targetColumnId.
  const referencedColumnIds = new Set<string>();
  for (const rel of diagram.relationships) {
    referencedColumnIds.add(rel.sourceColumnId);
    referencedColumnIds.add(rel.targetColumnId);
  }

  const issues: ValidationIssue[] = [];

  // Look for columns whose name ends with _id / _fk (convention) but that have
  // no matching relationship.
  const fkPattern = /(_id|_fk)$/i;
  for (const col of table.columns) {
    if (col.isPrimary) continue; // PKs are allowed to have _id suffix
    if (!fkPattern.test(col.name)) continue;
    if (!referencedColumnIds.has(col.id)) {
      issues.push({
        code: "ORPHANED_FK_COLUMN",
        severity: "warning",
        message: `Column "${col.name}" looks like a foreign key but has no relationship.`,
        columnId: col.id,
      });
    }
  }

  return issues;
}

function nullableFkToNonNullablePk(diagram: Diagram, table: Table): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const rel of diagram.relationships) {
    if (rel.sourceTableId !== table.id) continue;

    const sourceCol = table.columns.find((c) => c.id === rel.sourceColumnId);
    const targetTable = diagram.tables.find((t) => t.id === rel.targetTableId);
    const targetCol = targetTable?.columns.find((c) => c.id === rel.targetColumnId);

    if (!sourceCol || !targetCol) continue;

    if (sourceCol.isNullable && !targetCol.isNullable) {
      issues.push({
        code: "NULLABLE_FK_TO_NON_NULLABLE_PK",
        severity: "warning",
        message: `"${sourceCol.name}" is nullable but points to non-nullable "${targetCol.name}".`,
        columnId: sourceCol.id,
      });
    }
  }

  return issues;
}

function emptyTable(table: Table): ValidationIssue | null {
  if (table.columns.length > 0) return null;
  return {
    code: "EMPTY_TABLE",
    severity: "warning",
    message: "Table has no columns.",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Run all validation rules against a single table and return any issues. */
export function validateTable(diagram: Diagram, table: Table): ValidationIssue[] {
  return [
    noPrimaryKey(table),
    emptyTable(table),
    ...duplicateColumnNames(table),
    ...emptyColumnName(table),
    ...orphanedForeignKey(diagram, table),
    ...nullableFkToNonNullablePk(diagram, table),
  ].filter(Boolean) as ValidationIssue[];
}

/** Run validation across the whole diagram, returning a map keyed by tableId. */
export function validateDiagram(diagram: Diagram): Map<string, ValidationIssue[]> {
  const result = new Map<string, ValidationIssue[]>();
  for (const table of diagram.tables) {
    const issues = validateTable(diagram, table);
    if (issues.length > 0) result.set(table.id, issues);
  }
  return result;
}

/** Total error + warning counts across all tables. */
export function diagramIssueSummary(issues: Map<string, ValidationIssue[]>) {
  let errors = 0;
  let warnings = 0;
  for (const tableIssues of issues.values()) {
    for (const i of tableIssues) {
      if (i.severity === "error") errors++;
      else warnings++;
    }
  }
  return { errors, warnings };
}
