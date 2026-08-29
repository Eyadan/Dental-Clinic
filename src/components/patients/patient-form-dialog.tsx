"use client";

import { useState, useTransition } from "react";
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
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
        setError(result.error ?? "Something went wrong");
      } else {
        reset();
        onOpenChange(false);
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Patient" : "Register New Patient"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" placeholder="Juan" {...register("first_name")} />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" placeholder="Dela Cruz" {...register("last_name")} />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_no">Contact Number</Label>
              <Input id="contact_no" placeholder="0917 123 4567" {...register("contact_no")} />
              {errors.contact_no && (
                <p className="text-sm text-destructive">{errors.contact_no.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Birth Date</Label>
              <Input id="birth_date" type="date" {...register("birth_date")} />
              {errors.birth_date && (
                <p className="text-sm text-destructive">{errors.birth_date.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="juan@example.com" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="medical_history">Medical History</Label>
            <Textarea
              id="medical_history"
              placeholder="Known conditions, medications, previous surgeries..."
              rows={3}
              {...register("medical_history")}
            />
            {errors.medical_history && (
              <p className="text-sm text-destructive">{errors.medical_history.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea
              id="allergies"
              placeholder="Known allergies to medications, materials, etc."
              rows={2}
              {...register("allergies")}
            />
            {errors.allergies && (
              <p className="text-sm text-destructive">{errors.allergies.message}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Cancel</Button>} />
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Register Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
