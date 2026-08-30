"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientSchema, type PatientFormData } from "@/lib/validations/patient.schema";
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
import { Loader2, User, Phone, Mail, Calendar, HeartPulse, AlertTriangle } from "lucide-react";
import type { Patient } from "@/lib/types/database";

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  onSubmit,
}: PatientFormDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(patient);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      first_name: patient?.first_name ?? "",
      last_name: patient?.last_name ?? "",
      contact_no: patient?.contact_no ?? "",
      email: patient?.email ?? "",
      birth_date: patient?.birth_date ?? "",
      medical_history: patient?.medical_history ?? "",
      allergies: patient?.allergies ?? "",
    },
  });

  // Re-populate form values whenever open or patient changes!
  useEffect(() => {
    if (open) {
      setError(null);
      reset({
        first_name: patient?.first_name ?? "",
        last_name: patient?.last_name ?? "",
        contact_no: patient?.contact_no ?? "",
        email: patient?.email ?? "",
        birth_date: patient?.birth_date ?? "",
        medical_history: patient?.medical_history ?? "",
        allergies: patient?.allergies ?? "",
      });
    }
  }, [open, patient, reset]);

  const handleFormSubmit = handleSubmit(async (data) => {
    setError(null);
    const formData = new FormData();
    formData.set("first_name", data.first_name);
    formData.set("last_name", data.last_name);
    formData.set("contact_no", data.contact_no);
    formData.set("email", data.email ?? "");
    formData.set("birth_date", data.birth_date ?? "");
    formData.set("medical_history", data.medical_history ?? "");
    formData.set("allergies", data.allergies ?? "");

    startTransition(async () => {
      const result = await onSubmit(formData);
      if (!result.success) {
        setError(result.error ?? "Something went wrong while saving patient record");
      } else {
        reset();
        onOpenChange(false);
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-border/80 p-6">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <User className="h-4 w-4 text-cyan-600" />
            {isEdit ? `Edit Patient — ${patient?.first_name} ${patient?.last_name}` : "Register New Patient"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name" className="text-xs font-semibold text-muted-foreground">
                First Name *
              </Label>
              <Input
                id="first_name"
                placeholder="First name"
                className="h-10 text-xs border-border/80 focus-visible:ring-cyan-500 rounded-xl"
                {...register("first_name")}
              />
              {errors.first_name && (
                <p className="text-[11px] font-medium text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-xs font-semibold text-muted-foreground">
                Last Name *
              </Label>
              <Input
                id="last_name"
                placeholder="Last name"
                className="h-10 text-xs border-border/80 focus-visible:ring-cyan-500 rounded-xl"
                {...register("last_name")}
              />
              {errors.last_name && (
                <p className="text-[11px] font-medium text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_no" className="text-xs font-semibold text-muted-foreground">
                Contact Number (+63...) *
              </Label>
              <Input
                id="contact_no"
                placeholder="09171234567"
                className="h-10 text-xs border-border/80 focus-visible:ring-cyan-500 rounded-xl"
                {...register("contact_no")}
              />
              {errors.contact_no && (
                <p className="text-[11px] font-medium text-destructive">{errors.contact_no.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="birth_date" className="text-xs font-semibold text-muted-foreground">
                Birth Date
              </Label>
              <Input
                id="birth_date"
                type="date"
                className="h-10 text-xs border-border/80 focus-visible:ring-cyan-500 rounded-xl"
                {...register("birth_date")}
              />
              {errors.birth_date && (
                <p className="text-[11px] font-medium text-destructive">{errors.birth_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="patient@example.com"
              className="h-10 text-xs border-border/80 focus-visible:ring-cyan-500 rounded-xl"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-[11px] font-medium text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="medical_history" className="text-xs font-semibold text-muted-foreground">
              Medical History & Previous Conditions
            </Label>
            <Textarea
              id="medical_history"
              placeholder="Known medical conditions, hypertension, diabetes, previous surgeries..."
              rows={2}
              className="text-xs border-border/80 focus-visible:ring-cyan-500 rounded-xl"
              {...register("medical_history")}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="allergies" className="text-xs font-semibold text-muted-foreground">
                Known Allergies (Medications / Materials)
              </Label>
              <span className="text-[10px] text-muted-foreground">Separate multiple with commas (or leave blank if none)</span>
            </div>
            <Textarea
              id="allergies"
              placeholder="e.g. Penicillin, Latex, Fent, Sample..."
              rows={2}
              className="text-xs border-border/80 focus-visible:ring-cyan-500 rounded-xl"
              {...register("allergies")}
            />
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
                isEdit ? "Save Patient Changes" : "Register Patient"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
