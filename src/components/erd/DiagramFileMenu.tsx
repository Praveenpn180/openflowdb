import { useRef, type RefObject } from "react";
import {
  ChevronDown,
  Code2,
  Download,
  FolderOpen,
  Image,
  Save,
  Sparkles,
  Eraser,
  Network,
  Upload,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { CanvasHandle } from "@/components/erd/Canvas";
import {
  downloadBlob,
  downloadDiagramJson,
  parseDiagramJson,
  slugifyDiagramName,
} from "@/lib/erd/io";
import { generateSql } from "@/lib/erd/sql";
import { actions, useDiagram } from "@/lib/erd/store";

export function DiagramFileMenu({
  canvasRef,
  onImportSql,
  readOnly,
}: {
  canvasRef: RefObject<CanvasHandle | null>;
  onImportSql: () => void;
  readOnly?: boolean;
}) {
  const diagram = useDiagram();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveDiagram = () => {
    downloadDiagramJson(diagram);
    toast.success("Diagram saved to file");
  };

  const openDiagram = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const raw = await file.text();
      const parsed = parseDiagramJson(raw);
      if (!parsed) {
        toast.error("Invalid diagram file.");
        return;
      }
      actions.importDiagram(parsed);
      toast.success(`Opened ${parsed.name || "diagram"}`);
    } catch {
      toast.error("Could not read diagram file.");
    }
  };

  const exportPng = async () => {
    if (diagram.tables.length === 0) {
      toast.error("Add tables before exporting an image.");
      return;
    }
    try {
      await canvasRef.current?.exportPng(`${slugifyDiagramName(diagram.name)}.png`);
      toast.success("PNG exported");
    } catch {
      toast.error("Could not export PNG.");
    }
  };

  const exportSql = () => {
    if (diagram.tables.length === 0) {
      toast.error("Add tables before exporting SQL.");
      return;
    }
    const sql = generateSql(diagram);
    const blob = new Blob([sql], { type: "text/plain" });
    downloadBlob(blob, `${slugifyDiagramName(diagram.name)}.sql`);
    toast.success("SQL exported");
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json,.openflowdb.json"
        className="hidden"
        onChange={onFileSelected}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 cursor-pointer">
            <Settings className="h-3.5 w-3.5" />
            <span>Canvas Actions</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 dark bg-popover text-popover-foreground">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold">Local File Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={openDiagram} disabled={readOnly}>
            <FolderOpen className="mr-2 h-4 w-4" />
            <span>Open Diagram file</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={saveDiagram}>
            <Save className="mr-2 h-4 w-4" />
            <span>Save to JSON file</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold">SQL Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={onImportSql} disabled={readOnly}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Import DDL SQL...</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportSql}>
            <Code2 className="mr-2 h-4 w-4" />
            <span>Export DDL SQL file</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold">Canvas Operations</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => actions.autoLayout()} disabled={readOnly}>
            <Network className="mr-2 h-4 w-4" />
            <span>Auto Layout tables</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportPng}>
            <Image className="mr-2 h-4 w-4" />
            <span>Export PNG Image</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.loadSample()} disabled={readOnly}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Load Sample schema</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              if (confirm("Are you sure you want to clear the canvas?")) {
                actions.clearAll();
              }
            }}
            disabled={readOnly}
            className="text-destructive focus:bg-destructive/15 focus:text-destructive"
          >
            <Eraser className="mr-2 h-4 w-4" />
            <span>Clear Canvas</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
