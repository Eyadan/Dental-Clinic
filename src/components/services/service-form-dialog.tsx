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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Stethoscope,
  Clock,
  Coins,
  FileText,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import type { DentalService } from "@/lib/types/database";

const serviceFormSchema = dentalServiceSchema.omit({ is_active: true });
type ServiceFormData = z.infer<typeof serviceFormSchema>;

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: DentalService | null;
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSubmit,
}: ServiceFormDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(service);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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

  const watchedName = watch("name");
  const watchedDuration = watch("default_duration_minutes");
  const watchedPrice = watch("default_price");

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
    formData.set("name", data.name.trim());
    formData.set("description", (data.description ?? "").trim());
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

  const formattedPrice = isNaN(Number(watchedPrice))
    ? "0.00"
    : Number(watchedPrice).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl border border-border/80 bg-background p-0 shadow-2xl overflow-hidden">
        {/* PREMIUM GRADIENT HEADER */}
        <div className="bg-gradient-to-r from-cyan-500/15 via-teal-500/10 to-transparent border-b border-border/60 p-5 pb-4">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-cyan-600/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-xs">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    {isEdit ? "Edit Clinical Procedure" : "New Dental Procedure"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {isEdit
                      ? `Refine procedure pricing, duration, and patient details for ${service?.name}`
                      : "Add a new dental procedure to the clinic services catalog"}
                  </DialogDescription>
                </div>
              </div>
              {isEdit && (
                <Badge
                  variant={service?.is_active ? "default" : "secondary"}
                  className="text-[10px] font-bold uppercase tracking-wider h-5 px-2"
                >
                  {service?.is_active ? "Active" : "Inactive"}
                </Badge>
              )}
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
          {error && (
            <Alert variant="destructive" className="rounded-xl border-red-500/20 bg-red-500/10 text-xs">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* PROCEDURE NAME */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-600" /> Procedure Name *
              </span>
              <span className="text-[10px] text-muted-foreground">Required</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Dental Checkup & Cleaning"
              className="h-10 text-xs bg-muted/20 border-border/80 focus-visible:ring-cyan-500 rounded-xl"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-[11px] font-medium text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-cyan-600" /> Clinical Description
            </Label>
            <Textarea
              id="description"
              placeholder="Detailed description of the procedure, clinical indications, and expected patient instructions..."
              rows={2}
              className="text-xs bg-muted/20 border-border/80 focus-visible:ring-cyan-500 rounded-xl resize-none"
              {...register("description")}
            />
          </div>

          {/* DURATION & PRICE ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* DURATION WITH QUICK PRESET CHIPS */}
            <div className="space-y-1.5">
              <Label
                htmlFor="default_duration_minutes"
                className="text-xs font-semibold text-foreground flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-cyan-600" /> Duration (Minutes) *
                </span>
                <span className="text-[10px] font-mono text-cyan-600 font-bold">
                  {watchedDuration || 0}m
                </span>
              </Label>
              <div className="relative">
                <Input
                  id="default_duration_minutes"
                  type="number"
                  min="5"
                  step="5"
                  placeholder="30"
                  className="h-10 text-xs bg-muted/20 border-border/80 focus-visible:ring-cyan-500 rounded-xl font-mono"
                  {...register("default_duration_minutes", { valueAsNumber: true })}
                />
              </div>

              {/* QUICK CHIPS */}
              <div className="flex items-center gap-1 flex-wrap pt-1">
                {DURATION_PRESETS.map((dur) => {
                  const isSelected = Number(watchedDuration) === dur;
                  return (
                    <button
                      key={dur}
                      type="button"
                      onClick={() =>
                        setValue("default_duration_minutes", dur, { shouldValidate: true })
                      }
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-cyan-600 text-white border-cyan-600 font-bold shadow-2xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60"
                      }`}
                    >
                      {dur}m
                    </button>
                  );
                })}
              </div>

              {errors.default_duration_minutes && (
                <p className="text-[11px] font-medium text-destructive">
                  {errors.default_duration_minutes.message}
                </p>
              )}
            </div>

            {/* DEFAULT PRICE WITH CURRENCY ADORNMENT */}
            <div className="space-y-1.5">
              <Label
                htmlFor="default_price"
                className="text-xs font-semibold text-foreground flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-cyan-600" /> Default Price *
                </span>
                <span className="text-[10px] font-mono text-cyan-600 font-bold">
                  PHP
                </span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold font-mono text-xs">
                  ₱
                </span>
                <Input
                  id="default_price"
                  type="number"
                  step="50"
                  min="0"
                  placeholder="500.00"
                  className="h-10 pl-7 text-xs bg-muted/20 border-border/80 focus-visible:ring-cyan-500 rounded-xl font-mono font-semibold"
                  {...register("default_price", { valueAsNumber: true })}
                />
              </div>

              <p className="text-[10px] text-muted-foreground pt-1 flex items-center justify-between">
                <span>Display format:</span>
                <span className="font-mono font-bold text-foreground">₱{formattedPrice}</span>
              </p>

              {errors.default_price && (
                <p className="text-[11px] font-medium text-destructive">
                  {errors.default_price.message}
                </p>
              )}
            </div>
          </div>

          {/* LIVE SUMMARY CARD PREVIEW */}
          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Patient Catalog Preview
            </span>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                <span className="font-bold text-foreground truncate max-w-[220px]">
                  {watchedName?.trim() || "Untitled Procedure"}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/80 text-muted-foreground">
                  {watchedDuration || 0} mins
                </Badge>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                  ₱{formattedPrice}
                </span>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-9 px-4 rounded-xl text-xs border-border/80 hover:bg-muted/60"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="h-9 px-5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : isEdit ? (
                "Save Procedure Changes"
              ) : (
                "Create Procedure"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
