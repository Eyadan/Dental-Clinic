"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const BLOCK_TYPES = [
  { value: "vacation", label: "Vacation" },
  { value: "break", label: "Break" },
  { value: "sick_leave", label: "Sick Leave" },
  { value: "other", label: "Other" },
];

const RECURRENCE_RULES = [
  { value: "none", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

interface BlockFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dentistId: string;
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export function BlockFormDialog({
  open,
  onOpenChange,
  dentistId,
  onSubmit,
}: BlockFormDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [blockType, setBlockType] = useState("vacation");
  const [recurrenceRule, setRecurrenceRule] = useState("none");

  const handleBlockTypeChange = (value: string | null) => setBlockType(value ?? "vacation");
  const handleRecurrenceChange = (value: string | null) => setRecurrenceRule(value ?? "none");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("dentist_id", dentistId);
    formData.set("block_type", blockType);
    formData.set("recurrence_rule", recurrenceRule);

    startTransition(async () => {
      const result = await onSubmit(formData);
      if (!result.success) {
        setError(result.error ?? "Something went wrong");
      } else {
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Time-Off Block</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_datetime">Start</Label>
              <Input id="start_datetime" type="datetime-local" name="start_datetime" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_datetime">End</Label>
              <Input id="end_datetime" type="datetime-local" name="end_datetime" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="block_type">Block Type</Label>
              <Select value={blockType} onValueChange={handleBlockTypeChange}>
                <SelectTrigger id="block_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOCK_TYPES.map((bt) => (
                    <SelectItem key={bt.value} value={bt.value}>
                      {bt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurrence_rule">Recurrence</Label>
              <Select value={recurrenceRule} onValueChange={handleRecurrenceChange}>
                <SelectTrigger id="recurrence_rule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_RULES.map((rr) => (
                    <SelectItem key={rr.value} value={rr.value}>
                      {rr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              name="reason"
              placeholder="Reason for time-off..."
              rows={2}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Block
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
