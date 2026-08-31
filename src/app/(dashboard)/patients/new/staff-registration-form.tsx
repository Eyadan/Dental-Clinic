"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientSchema, type PatientFormData } from "@/lib/validations/patient.schema";
import { buildPatientFormDefaults, appendPatientFormData } from "@/lib/utils/patient-form-defaults";
import { createPatientAction, checkDuplicatePatientAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PatientFormPersonalSection } from "@/components/patients/patient-form-personal-section";
import { PatientFormDentalHistorySection } from "@/components/patients/patient-form-dental-history-section";
import { PatientFormMedicalQuestionsSection } from "@/components/patients/patient-form-medical-questions-section";
import { PatientFormAllergyConditionsSection } from "@/components/patients/patient-form-allergy-conditions-section";
import { Loader2, UserPlus, AlertTriangle } from "lucide-react";
import type { MedicalCondition } from "@/lib/types/database";

interface StaffRegistrationFormProps {
  conditions: MedicalCondition[];
}

const TABS = ["Personal Info", "Dental History", "Medical History"] as const;
type Tab = (typeof TABS)[number];

export function StaffRegistrationForm({ conditions }: StaffRegistrationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Personal Info");
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: buildPatientFormDefaults(),
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

    try {
      const result = await createPatientAction(appendPatientFormData(data));
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
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Patient Registration</h1>
        <p className="text-muted-foreground">Register a patient using the PDA Dental Chart information</p>
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

      <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
              activeTab === tab
                ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{activeTab}</CardTitle>
          </CardHeader>
          <CardContent onBlurCapture={handleDuplicateCheck}>
            {activeTab === "Personal Info" && <PatientFormPersonalSection register={register} errors={errors} />}
            {activeTab === "Dental History" && <PatientFormDentalHistorySection register={register} />}
            {activeTab === "Medical History" && (
              <div className="space-y-4">
                <PatientFormMedicalQuestionsSection register={register} />
                <PatientFormAllergyConditionsSection register={register} watch={watch} setValue={setValue} conditions={conditions} />
              </div>
            )}
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
