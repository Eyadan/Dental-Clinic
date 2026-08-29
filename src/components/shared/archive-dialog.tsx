"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Archive, Loader2, AlertTriangle } from "lucide-react";

interface ArchiveDialogProps {
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "destructive";
  title: string;
  description: string;
  itemName: string;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
}

export function ArchiveDialog({
  triggerLabel = "Archive",
  triggerVariant = "outline",
  title,
  description,
  itemName,
  onConfirm,
}: ArchiveDialogProps) {
  const [open, setOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsArchiving(true);
    setError(null);
    const result = await onConfirm();
    setIsArchiving(false);
    if (result.success) {
      setOpen(false);
    } else {
      setError(result.error ?? "Failed to archive");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={triggerVariant} size="sm">
            <Archive className="mr-2 h-4 w-4" />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-sm">
            <span className="font-medium">Item:</span> {itemName}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isArchiving}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isArchiving}>
            {isArchiving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Archiving...</>
            ) : (
              <><Archive className="mr-2 h-4 w-4" /> Confirm Archive</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
