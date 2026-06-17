import { useRef, type RefObject } from "react";
import { ChevronDown, Code2, Download, FolderOpen, Image, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

export function DiagramFileMenu({ canvasRef }: { canvasRef: RefObject<CanvasHandle | null> }) {
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
      <Button variant="ghost" size="sm" onClick={saveDiagram}>
        <Save className="mr-1 h-3.5 w-3.5" /> Save
      </Button>
      <Button variant="ghost" size="sm" onClick={openDiagram}>
        <FolderOpen className="mr-1 h-3.5 w-3.5" /> Open
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Download className="mr-1 h-3.5 w-3.5" /> Export
            <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="dark bg-popover text-popover-foreground">
          <DropdownMenuItem onClick={exportPng}>
            <Image className="mr-2 h-4 w-4" />
            PNG image
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportSql}>
            <Code2 className="mr-2 h-4 w-4" />
            SQL file
          </DropdownMenuItem>
          <DropdownMenuItem onClick={saveDiagram}>
            <Save className="mr-2 h-4 w-4" />
            Diagram JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
