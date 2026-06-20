import { useEffect, useState } from "react";
import { Share2, Copy, Trash2, Plus, Check, Eye, Edit2, Loader2, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { listShares, createShare, deleteShare, buildShareUrl } from "@/lib/diagrams/shares";
import type { ShareRow, ShareRole } from "@/lib/diagrams/shares";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  diagramId: string;
}

export function ShareDialog({ diagramId }: Props) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState<ShareRole>("viewer");
  const [newLabel, setNewLabel] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listShares(diagramId)
      .then(setShares)
      .catch(() => toast.error("Failed to load share links"))
      .finally(() => setLoading(false));
  }, [open, diagramId]);

  async function handleCreate() {
    setCreating(true);
    try {
      const share = await createShare(diagramId, newRole, newLabel || undefined);
      setShares((prev) => [share, ...prev]);
      setNewLabel("");
      toast.success("Share link created");
    } catch {
      toast.error("Failed to create share link");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(shareId: string) {
    try {
      await deleteShare(shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      toast.success("Share link revoked");
    } catch {
      toast.error("Failed to revoke share link");
    }
  }

  async function handleCopy(token: string) {
    const url = buildShareUrl(token);
    await navigator.clipboard.writeText(url);
    setCopied(token);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Share2 className="h-3.5 w-3.5" /> Share
        </Button>
      </DialogTrigger>

      <DialogContent className="dark max-w-lg bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" /> Share Diagram
          </DialogTitle>
          <DialogDescription>
            Create share links. Viewers can see the diagram; editors can make changes.
          </DialogDescription>
        </DialogHeader>

        {/* Create new link */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            New share link
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Label (optional)</Label>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Team review"
                className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <div className="flex rounded-md border border-input overflow-hidden">
                {(["viewer", "editor"] as ShareRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setNewRole(r)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition",
                      newRole === r
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {r === "viewer" ? <Eye className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
                    {r === "viewer" ? "Viewer" : "Editor"}
                  </button>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={handleCreate} disabled={creating} className="gap-1">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create
            </Button>
          </div>
        </div>

        {/* Existing links */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Active links ({shares.length})
          </p>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : shares.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
              No share links yet
            </p>
          ) : (
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {shares.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                      s.role === "editor"
                        ? "bg-sky-500/15 text-sky-500"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {s.role === "editor" ? <Edit2 className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {s.label ?? "Untitled link"}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {buildShareUrl(s.share_token).replace(/^https?:\/\//, "")}
                    </p>
                  </div>
                  <span className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    s.role === "editor"
                      ? "bg-sky-500/10 text-sky-400"
                      : "bg-muted text-muted-foreground",
                  )}>
                    {s.role}
                  </span>
                  <button
                    onClick={() => handleCopy(s.share_token)}
                    className="shrink-0 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Copy link"
                  >
                    {copied === s.share_token ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="shrink-0 rounded p-1 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Revoke link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
