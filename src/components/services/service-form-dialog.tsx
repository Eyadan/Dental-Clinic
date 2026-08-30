"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { dentalServiceSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Layers } from "lucide-react";
import type { DentalService } from "@/lib/types/database";

const serviceFormSchema = dentalServiceSchema.omit({ is_active: true });
type ServiceFormData = z.infer<typeof serviceFormSchema>;

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: DentalService | null;
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export function ServiceFormDialog({ open, onOpenChange, service, onSubmit }: ServiceFormDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(service);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      default_duration_minutes: service?.default_duration_minutes ?? 30,
      default_price: service?.default_price ?? 0,
    },
  });

  // Auto-populate form fields whenever open or service changes!
  useEffect(() => {
    if (open) {
      setError(null);
      reset({
        name: service?.name ?? "",
        description: service?.description ?? "",
        default_duration_minutes: service?.default_duration_minutes ?? 30,
        default_price: service?.default_price ?? 0,
      });
    }
  }, [open, service, reset]);

  const handleFormSubmit = handleSubmit(async (data) => {
    setError(null);
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("description", data.description ?? "");
    formData.set("default_duration_minutes", String(data.default_duration_minutes));
    formData.set("default_price", String(data.default_price));

    startTransition(async () => {
      const result = await onSubmit(formData);
      if (!result.success) {
        setError(result.error ?? "Something went wrong saving procedure");
      } else {
        reset();
        onOpenChange(false);
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border/80 p-6">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-600" />
            {isEdit ? `Edit Procedure — ${service?.name}` : "New Dental Procedure"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground">Procedure Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Tooth Extraction & Cleaning"
              className="h-10 text-xs border-border/80 focus-visible:ring-cyan-500 rounded-xl"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-[11px] font-medium text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief summary of procedure steps..."
              rows={2}
              className="text-xs border-border/80 focus-visible:ring-cyan-500 rounded-xl"
              {...register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="default_duration_minutes" className="text-xs font-semibold text-muted-foreground">Duration (Minutes) *</Label>
              <Input
                id="default_duration_minutes"
                type="number"
                placeholder="30"
                className="h-10 text-xs border-border/80 focus-visible:ring-cyan-500 rounded-xl"
                {...register("default_duration_minutes", { valueAsNumber: true })}
              />
              {errors.default_duration_minutes && (
                <p className="text-[11px] font-medium text-destructive">{errors.default_duration_minutes.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="default_price" className="text-xs font-semibold text-muted-foreground">Default Price (₱) *</Label>
              <Input
                id="default_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="h-10 text-xs border-border/80 focus-visible:ring-cyan-500 rounded-xl"
                {...register("default_price", { valueAsNumber: true })}
              />
              {errors.default_price && (
                <p className="text-[11px] font-medium text-destructive">{errors.default_price.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-9 rounded-xl text-xs border-border/80"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              {isPending ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...</>
              ) : (
                isEdit ? "Save Procedure Changes" : "Create Procedure"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
