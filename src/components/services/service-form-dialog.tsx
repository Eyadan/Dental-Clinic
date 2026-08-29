"use client";

import { useState, useTransition } from "react";
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
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
        setError(result.error ?? "Something went wrong");
      } else {
        reset();
        onOpenChange(false);
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Service" : "New Dental Service"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Service Name</Label>
            <Input
              id="name"
              placeholder="e.g. Routine Checkup"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the service"
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default_duration_minutes">Duration (minutes)</Label>
              <Input
                id="default_duration_minutes"
                type="number"
                min={1}
                max={480}
                {...register("default_duration_minutes", { valueAsNumber: true })}
              />
              {errors.default_duration_minutes && (
                <p className="text-sm text-destructive">
                  {errors.default_duration_minutes.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_price">Price (₱)</Label>
              <Input
                id="default_price"
                type="number"
                min={0}
                max={999999.99}
                step="0.01"
                {...register("default_price", { valueAsNumber: true })}
              />
              {errors.default_price && (
                <p className="text-sm text-destructive">
                  {errors.default_price.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
