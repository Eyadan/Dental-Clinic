"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientSchema, type PatientFormData } from "@/lib/validations/patient.schema";
import { createPatientAction, checkDuplicatePatientAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserPlus, AlertTriangle } from "lucide-react";

export function StaffRegistrationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
  });

  const firstName = watch("first_name");
  const lastName = watch("last_name");
  const contactNo = watch("contact_no");

  const handleDuplicateCheck = async () => {
    if (!firstName?.trim() || !lastName?.trim() || !contactNo?.trim()) return;

    setDuplicateWarning(null);
    setOverrideDuplicate(false);

    const result = await checkDuplicatePatientAction(firstName, lastName, contactNo);
    if (result.success && result.data?.isDuplicate) {
      setDuplicateWarning(
        `A patient with the same name and contact number already exists (ID: ${result.data.existingPatientId}). Proceed only if you confirm this is a different person.`,
      );
    }
  };

  const onSubmit = async (data: PatientFormData) => {
    setError(null);

    if (duplicateWarning && !overrideDuplicate) {
      setError("Please confirm the duplicate warning above before submitting.");
      return;
    }

    setIsSubmitting(true);

    const fd = new FormData();
    fd.append("first_name", data.first_name);
    fd.append("last_name", data.last_name);
    fd.append("contact_no", data.contact_no);
    fd.append("email", data.email ?? "");
    fd.append("birth_date", data.birth_date ?? "");
    fd.append("medical_history", data.medical_history ?? "");
    fd.append("allergies", data.allergies ?? "");

    try {
      const result = await createPatientAction(fd);
      if (result.success && result.data) {
        router.push(`/patients/${result.data.id}`);
      } else {
        setError(result.error ?? "Failed to create patient");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Patient Registration</h1>
        <p className="text-muted-foreground">Register a patient on their behalf</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {duplicateWarning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>{duplicateWarning}</p>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={overrideDuplicate}
                onChange={(e) => setOverrideDuplicate(e.target.checked)}
              />
              I confirm this is a different person
            </label>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input id="first_name" {...register("first_name")} />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input id="last_name" {...register("last_name")} />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Date of Birth</Label>
              <Input id="birth_date" type="date" {...register("birth_date")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_no">Contact Number *</Label>
              <Input
                id="contact_no"
                placeholder="09171234567"
                {...register("contact_no")}
                onBlur={handleDuplicateCheck}
              />
              {errors.contact_no && (
                <p className="text-sm text-destructive">{errors.contact_no.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="medical_history">Medical History</Label>
              <Textarea
                id="medical_history"
                rows={3}
                placeholder="Diabetes, hypertension, etc."
                {...register("medical_history")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                rows={2}
                placeholder="Penicillin, latex, etc."
                {...register("allergies")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/patients")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Register Patient
          </Button>
        </div>
      </form>
    </div>
  );
}
