import { useSyncExternalStore } from "react";
import type { Column, Diagram, Relationship, Table } from "./types";
import { emptyDiagram, newColumn, newTable, sampleDiagram, uid } from "./factory";
import { autoLayoutDiagram } from "./layout";

const STORAGE_KEY = "openflowdb:diagram:v1";

const HISTORY_LIMIT = 100;

interface State {
  diagram: Diagram;
  selectedTableId: string | null;
  /** IDs of all currently selected tables (superset — always includes selectedTableId when set) */
  selectedTableIds: Set<string>;
  layoutRevision: number;
  past: Diagram[];
  future: Diagram[];
}

let state: State = {
  diagram: sampleDiagram(),
  selectedTableId: null,
  selectedTableIds: new Set(),
  layoutRevision: 0,
  past: [],
  future: [],
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

/**
 * Mutate state without touching history (for selection, viewport, etc.)
 */
function setState(updater: (s: State) => State) {
  state = updater(state);
  emit();
}

/**
 * Mutate the diagram AND push the old diagram snapshot onto `past`.
 * Always clears `future`.
 */
function updateDiagram(updater: (d: Diagram) => Diagram, snapshot = true) {
  setState((s) => {
    const next = updater(s.diagram);
    if (next === s.diagram) return s; // no-op
    const past = snapshot
      ? [...s.past.slice(-(HISTORY_LIMIT - 1)), s.diagram]
      : s.past;
    return { ...s, diagram: next, past, future: snapshot ? [] : s.future };
  });
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

export function useSelectedTableIds(): Set<string> {
  return useSyncExternalStore(
    subscribe,
    () => state.selectedTableIds,
    () => state.selectedTableIds,
  );
}

export function useLayoutRevision(): number {
  return useSyncExternalStore(
    subscribe,
    () => state.layoutRevision,
    () => state.layoutRevision,
  );
}

export function useCanUndo(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.past.length > 0,
    () => state.past.length > 0,
  );
}

export function useCanRedo(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.future.length > 0,
    () => state.future.length > 0,
  );
}

// ---- actions ----
export const actions = {
  // ---- history ----
  undo() {
    setState((s) => {
      if (s.past.length === 0) return s;
      const past = [...s.past];
      const prev = past.pop()!;
      return {
        ...s,
        diagram: prev,
        past,
        future: [s.diagram, ...s.future.slice(0, HISTORY_LIMIT - 1)],
      };
    });
  },

  redo() {
    setState((s) => {
      if (s.future.length === 0) return s;
      const [next, ...future] = s.future;
      return {
        ...s,
        diagram: next,
        past: [...s.past.slice(-(HISTORY_LIMIT - 1)), s.diagram],
        future,
      };
    });
  },

  // ---- selection ----
  selectTable(id: string | null) {
    setState((s) => ({
      ...s,
      selectedTableId: id,
      selectedTableIds: id ? new Set([id]) : new Set(),
    }));
  },

  /** Toggle a table in/out of the multi-select set without clearing others. */
  toggleTableSelection(id: string) {
    setState((s) => {
      const next = new Set(s.selectedTableIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // Keep selectedTableId pointing to the last-clicked one (or null if empty)
      const primaryId = next.has(id) ? id : (next.values().next().value ?? null);
      return { ...s, selectedTableIds: next, selectedTableId: primaryId ?? null };
    });
  },

  /** Replace the whole multi-select set (e.g. from a drag-marquee). */
  setSelectedTableIds(ids: string[]) {
    setState((s) => {
      const next = new Set(ids);
      const primary = ids[ids.length - 1] ?? null;
      return { ...s, selectedTableIds: next, selectedTableId: primary };
    });
  },

  // ---- diagram metadata ----
  renameDiagram(name: string) {
    updateDiagram((d) => ({ ...d, name }));
  },

  setDialect(dialect: Diagram["dialect"]) {
    updateDiagram((d) => ({ ...d, dialect }));
  },

  // ---- tables ----
  addTable(at?: { x: number; y: number }) {
    let createdId = "";
    setState((s) => {
      const t = newTable({ ...(at ?? {}) }, s.diagram.tables.length);
      createdId = t.id;
      const past = [...s.past.slice(-(HISTORY_LIMIT - 1)), s.diagram];
      return {
        ...s,
        selectedTableId: t.id,
        selectedTableIds: new Set([t.id]),
        past,
        future: [],
        diagram: { ...s.diagram, tables: [...s.diagram.tables, t] },
      };
    });
    return createdId;
  },

  removeTable(id: string) {
    setState((s) => {
      const next = new Set(s.selectedTableIds);
      next.delete(id);
      const past = [...s.past.slice(-(HISTORY_LIMIT - 1)), s.diagram];
      return {
        ...s,
        selectedTableId: s.selectedTableId === id ? null : s.selectedTableId,
        selectedTableIds: next,
        past,
        future: [],
        diagram: {
          ...s.diagram,
          tables: s.diagram.tables.filter((t) => t.id !== id),
          relationships: s.diagram.relationships.filter(
            (r) => r.sourceTableId !== id && r.targetTableId !== id,
          ),
        },
      };
    });
  },

  updateTable(id: string, patch: Partial<Table>) {
    updateDiagram((d) => ({
      ...d,
      tables: d.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },

  moveTable(id: string, x: number, y: number) {
    // no snapshot for continuous drag — snapshot on pointerup via commitMove
    updateDiagram(
      (d) => ({
        ...d,
        tables: d.tables.map((t) => (t.id === id ? { ...t, x, y } : t)),
      }),
      false, // don't push to history on every pixel
    );
  },

  /** Call after a drag ends to push a single snapshot. */
  commitMove() {
    setState((s) => {
      if (s.past[s.past.length - 1] === s.diagram) return s;
      const past = [...s.past.slice(-(HISTORY_LIMIT - 1)), s.diagram];
      return { ...s, past, future: [] };
    });
  },

  // ---- bulk actions ----
  bulkMoveTable(ids: string[], dx: number, dy: number) {
    updateDiagram(
      (d) => ({
        ...d,
        tables: d.tables.map((t) =>
          ids.includes(t.id) ? { ...t, x: Math.round(t.x + dx), y: Math.round(t.y + dy) } : t,
        ),
      }),
      false,
    );
  },

  bulkDeleteTables(ids: string[]) {
    setState((s) => {
      const past = [...s.past.slice(-(HISTORY_LIMIT - 1)), s.diagram];
      return {
        ...s,
        selectedTableId: null,
        selectedTableIds: new Set(),
        past,
        future: [],
        diagram: {
          ...s.diagram,
          tables: s.diagram.tables.filter((t) => !ids.includes(t.id)),
          relationships: s.diagram.relationships.filter(
            (r) => !ids.includes(r.sourceTableId) && !ids.includes(r.targetTableId),
          ),
        },
      };
    });
  },

  bulkRecolorTables(ids: string[], color: string) {
    updateDiagram((d) => ({
      ...d,
      tables: d.tables.map((t) => (ids.includes(t.id) ? { ...t, color } : t)),
    }));
  },

  // ---- columns ----
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

  // ---- relationships ----
  addRelationship(rel: Omit<Relationship, "id">) {
    updateDiagram((d) => {
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

  updateRelationship(id: string, patch: Partial<Omit<Relationship, "id">>) {
    updateDiagram((d) => ({
      ...d,
      relationships: d.relationships.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  },

  removeRelationship(id: string) {
    updateDiagram((d) => ({
      ...d,
      relationships: d.relationships.filter((r) => r.id !== id),
    }));
  },

  // ---- global ----
  loadSample() {
    setState((s) => ({
      ...s,
      diagram: sampleDiagram(),
      selectedTableId: null,
      selectedTableIds: new Set(),
      past: [],
      future: [],
    }));
  },

  clearAll() {
    setState((s) => ({
      ...s,
      diagram: emptyDiagram(),
      selectedTableId: null,
      selectedTableIds: new Set(),
      past: [],
      future: [],
    }));
  },

  importDiagram(d: Diagram) {
    setState((s) => ({
      ...s,
      diagram: d,
      selectedTableId: null,
      selectedTableIds: new Set(),
      past: [],
      future: [],
    }));
  },

  autoLayout() {
    setState((s) => {
      const laid = autoLayoutDiagram(s.diagram);
      const past = [...s.past.slice(-(HISTORY_LIMIT - 1)), s.diagram];
      return {
        ...s,
        layoutRevision: s.layoutRevision + 1,
        diagram: laid,
        past,
        future: [],
      };
    });
  },
};
