"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientSchema, type PatientFormData } from "@/lib/validations/patient.schema";
import { buildPatientFormDefaults, appendPatientFormData } from "@/lib/utils/patient-form-defaults";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PatientFormPersonalSection } from "./patient-form-personal-section";
import { PatientFormDentalHistorySection } from "./patient-form-dental-history-section";
import { PatientFormMedicalQuestionsSection } from "./patient-form-medical-questions-section";
import { PatientFormAllergyConditionsSection } from "./patient-form-allergy-conditions-section";
import { Loader2, User } from "lucide-react";
import type { Patient, PatientMedicalRecord, MedicalCondition } from "@/lib/types/database";

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
  medicalRecord?: PatientMedicalRecord | null;
  conditionIds?: string[];
  conditions: MedicalCondition[];
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

const TABS = ["Personal Info", "Dental History", "Medical History"] as const;
type Tab = (typeof TABS)[number];

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  medicalRecord,
  conditionIds = [],
  conditions,
  onSubmit,
}: PatientFormDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Personal Info");
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(patient);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: buildPatientFormDefaults(patient, medicalRecord, conditionIds),
  });

  const prevOpen = useRef(false);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setError(null);
      setActiveTab("Personal Info");
      reset(buildPatientFormDefaults(patient, medicalRecord, conditionIds));
    }
    prevOpen.current = open;
  }, [open, patient, medicalRecord, conditionIds, reset]);

  const handleFormSubmit = handleSubmit(async (data) => {
    setError(null);
    const formData = appendPatientFormData(data);

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
      <DialogContent className="sm:max-w-2xl rounded-2xl border-border/80 p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <User className="h-4 w-4 text-cyan-600" />
            {isEdit ? `Edit Patient — ${patient?.first_name} ${patient?.last_name}` : "Register New Patient"}
          </DialogTitle>
        </DialogHeader>

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

        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {activeTab === "Personal Info" && <PatientFormPersonalSection register={register} errors={errors} />}
          {activeTab === "Dental History" && <PatientFormDentalHistorySection register={register} />}
          {activeTab === "Medical History" && (
            <>
              <PatientFormMedicalQuestionsSection register={register} />
              <PatientFormAllergyConditionsSection register={register} watch={watch} setValue={setValue} conditions={conditions} />
            </>
          )}

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
