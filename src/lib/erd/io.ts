import type { Diagram } from "./types";

export function slugifyDiagramName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "diagram";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

export function downloadDiagramJson(diagram: Diagram) {
  const json = JSON.stringify(diagram, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, `${slugifyDiagramName(diagram.name)}.openflowdb.json`);
}

export function parseDiagramJson(raw: string): Diagram | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Diagram>;
    if (!parsed || !Array.isArray(parsed.tables) || !Array.isArray(parsed.relationships)) {
      return null;
    }
    return parsed as Diagram;
  } catch {
    return null;
  }
}
