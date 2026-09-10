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

  const handleNextTab = () => {
    if (activeTab === "Personal Info") setActiveTab("Dental History");
    else if (activeTab === "Dental History") setActiveTab("Medical History");
  };

  const handlePrevTab = () => {
    if (activeTab === "Medical History") setActiveTab("Dental History");
    else if (activeTab === "Dental History") setActiveTab("Personal Info");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] sm:max-w-3xl lg:max-w-4xl max-h-[88vh] rounded-3xl border-border/80 p-6 sm:p-7 flex flex-col overflow-hidden shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border/40 shrink-0 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-600">
              <User className="h-4 w-4" />
            </div>
            {isEdit ? `Edit Patient — ${patient?.first_name} ${patient?.last_name}` : "Register New Patient Record"}
          </DialogTitle>
        </DialogHeader>

        <div className="shrink-0 py-3 flex items-center justify-between gap-3 border-b border-border/40 bg-muted/20 -mx-6 px-6">
          <div className="inline-flex items-center gap-1.5 p-1 bg-card rounded-xl border border-border/80 text-xs font-semibold shadow-2xs">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  activeTab === tab
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
            Section: <strong className="text-foreground">{activeTab}</strong>
          </span>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden pt-3">
          {error && (
            <Alert variant="destructive" className="rounded-xl mb-3 shrink-0">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-4">
            {activeTab === "Personal Info" && <PatientFormPersonalSection register={register} errors={errors} />}
            {activeTab === "Dental History" && <PatientFormDentalHistorySection register={register} />}
            {activeTab === "Medical History" && (
              <>
                <PatientFormMedicalQuestionsSection register={register} />
                <PatientFormAllergyConditionsSection register={register} watch={watch} setValue={setValue} conditions={conditions} />
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/40 shrink-0 mt-auto bg-card -mx-6 px-6 pb-1">
            <div className="flex items-center gap-2">
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
              {activeTab !== "Personal Info" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrevTab}
                  disabled={isPending}
                  className="h-9 rounded-xl text-xs border-border/80"
                >
                  ◄ Previous Section
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeTab !== "Medical History" ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleNextTab}
                  className="h-9 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Next Section ►
                </Button>
              ) : null}

              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {isPending ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...</>
                ) : (
                  isEdit ? "Save Patient Changes" : "Complete Registration"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
