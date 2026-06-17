import { useSyncExternalStore } from "react";
import type { Column, Diagram, Relationship, Table } from "./types";
import { emptyDiagram, newColumn, newTable, sampleDiagram, uid } from "./factory";
import { autoLayoutDiagram } from "./layout";

const STORAGE_KEY = "openflowdb:diagram:v1";

interface State {
  diagram: Diagram;
  selectedTableId: string | null;
  layoutRevision: number;
}

let state: State = {
  diagram: sampleDiagram(),
  selectedTableId: null,
  layoutRevision: 0,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
  persist();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.diagram));
  } catch {
    /* ignore */
  }
}

export function hydrate() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Diagram;
      if (parsed && Array.isArray(parsed.tables)) {
        state = { ...state, diagram: parsed };
        emit();
      }
    }
  } catch {
    /* ignore */
  }
}

function setState(updater: (s: State) => State) {
  state = updater(state);
  emit();
}

function updateDiagram(updater: (d: Diagram) => Diagram) {
  setState((s) => ({ ...s, diagram: updater(s.diagram) }));
}

// ---- subscription hooks ----
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDiagram(): Diagram {
  return useSyncExternalStore(
    subscribe,
    () => state.diagram,
    () => state.diagram,
  );
}

export function useSelectedTableId(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => state.selectedTableId,
    () => state.selectedTableId,
  );
}

export function useLayoutRevision(): number {
  return useSyncExternalStore(
    subscribe,
    () => state.layoutRevision,
    () => state.layoutRevision,
  );
}

// ---- actions ----
export const actions = {
  selectTable(id: string | null) {
    setState((s) => ({ ...s, selectedTableId: id }));
  },

  renameDiagram(name: string) {
    updateDiagram((d) => ({ ...d, name }));
  },

  setDialect(dialect: Diagram["dialect"]) {
    updateDiagram((d) => ({ ...d, dialect }));
  },

  addTable(at?: { x: number; y: number }) {
    let createdId = "";
    setState((s) => {
      const t = newTable({ ...(at ?? {}) }, s.diagram.tables.length);
      createdId = t.id;
      return {
        ...s,
        selectedTableId: t.id,
        diagram: { ...s.diagram, tables: [...s.diagram.tables, t] },
      };
    });
    return createdId;
  },

  removeTable(id: string) {
    setState((s) => ({
      ...s,
      selectedTableId: s.selectedTableId === id ? null : s.selectedTableId,
      diagram: {
        ...s.diagram,
        tables: s.diagram.tables.filter((t) => t.id !== id),
        relationships: s.diagram.relationships.filter(
          (r) => r.sourceTableId !== id && r.targetTableId !== id,
        ),
      },
    }));
  },

  updateTable(id: string, patch: Partial<Table>) {
    updateDiagram((d) => ({
      ...d,
      tables: d.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },

  moveTable(id: string, x: number, y: number) {
    updateDiagram((d) => ({
      ...d,
      tables: d.tables.map((t) => (t.id === id ? { ...t, x, y } : t)),
    }));
  },

  addColumn(tableId: string) {
    updateDiagram((d) => ({
      ...d,
      tables: d.tables.map((t) =>
        t.id === tableId ? { ...t, columns: [...t.columns, newColumn()] } : t,
      ),
    }));
  },

  updateColumn(tableId: string, columnId: string, patch: Partial<Column>) {
    updateDiagram((d) => ({
      ...d,
      tables: d.tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              columns: t.columns.map((c) =>
                c.id === columnId ? { ...c, ...patch } : c,
              ),
            }
          : t,
      ),
    }));
  },

  removeColumn(tableId: string, columnId: string) {
    updateDiagram((d) => ({
      ...d,
      tables: d.tables.map((t) =>
        t.id === tableId
          ? { ...t, columns: t.columns.filter((c) => c.id !== columnId) }
          : t,
      ),
      relationships: d.relationships.filter(
        (r) => r.sourceColumnId !== columnId && r.targetColumnId !== columnId,
      ),
    }));
  },

  addRelationship(rel: Omit<Relationship, "id">) {
    updateDiagram((d) => {
      // prevent self & duplicates
      if (rel.sourceTableId === rel.targetTableId) return d;
      const exists = d.relationships.some(
        (r) =>
          r.sourceColumnId === rel.sourceColumnId &&
          r.targetColumnId === rel.targetColumnId,
      );
      if (exists) return d;
      return {
        ...d,
        relationships: [...d.relationships, { ...rel, id: uid("rel") }],
      };
    });
  },

  removeRelationship(id: string) {
    updateDiagram((d) => ({
      ...d,
      relationships: d.relationships.filter((r) => r.id !== id),
    }));
  },

  loadSample() {
    setState((s) => ({ ...s, diagram: sampleDiagram(), selectedTableId: null }));
  },

  clearAll() {
    setState((s) => ({ ...s, diagram: emptyDiagram(), selectedTableId: null }));
  },

  importDiagram(d: Diagram) {
    setState((s) => ({ ...s, diagram: d, selectedTableId: null }));
  },

  autoLayout() {
    setState((s) => ({
      ...s,
      layoutRevision: s.layoutRevision + 1,
      diagram: autoLayoutDiagram(s.diagram),
    }));
  },
};
