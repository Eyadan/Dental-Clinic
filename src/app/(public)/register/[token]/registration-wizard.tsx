"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientSchema, type PatientFormData } from "@/lib/validations/patient.schema";
import { buildPatientFormDefaults, appendPatientFormData } from "@/lib/utils/patient-form-defaults";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientFormPersonalSection } from "@/components/patients/patient-form-personal-section";
import { PatientFormDentalHistorySection } from "@/components/patients/patient-form-dental-history-section";
import { PatientFormMedicalQuestionsSection } from "@/components/patients/patient-form-medical-questions-section";
import { PatientFormAllergyConditionsSection } from "@/components/patients/patient-form-allergy-conditions-section";
import { Loader2, CheckCircle2, ChevronLeft, ChevronRight, ShieldCheck, User } from "lucide-react";
import { submitRegistrationAction } from "./actions";
import type { MedicalCondition } from "@/lib/types/database";

interface RegistrationWizardProps {
  token: string;
  appointmentId: string;
  patientName: string | null;
  conditions: MedicalCondition[];
}

const TABS = ["Personal Info", "Dental History", "Medical History", "Review"] as const;
type Tab = (typeof TABS)[number];

export function RegistrationWizard({ token, patientName, conditions }: RegistrationWizardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Personal Info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: buildPatientFormDefaults(),
  });

  const tabIndex = TABS.indexOf(activeTab);
  const progress = ((tabIndex + 1) / TABS.length) * 100;

  const validateCurrentTab = (): string | null => {
    const data = getValues();
    if (activeTab === "Personal Info") {
      if (!data.first_name?.trim()) return "First name is required";
      if (!data.last_name?.trim()) return "Last name is required";
      if (!data.contact_no?.trim()) return "Contact number is required";
      const phoneRegex = /^(\+63|0)[0-9]{10}$/;
      if (!phoneRegex.test(data.contact_no)) return "Invalid Philippine phone number (e.g., 09171234567)";
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Invalid email address";
    }
    return null;
  };

  const handleNext = () => {
    setError(null);
    const validationError = validateCurrentTab();
    if (validationError) {
      setError(validationError);
      return;
    }
    const nextIndex = Math.min(tabIndex + 1, TABS.length - 1);
    setActiveTab(TABS[nextIndex]);
  };

  const handleBack = () => {
    setError(null);
    const prevIndex = Math.max(tabIndex - 1, 0);
    setActiveTab(TABS[prevIndex]);
  };

  const onSubmit = async (data: PatientFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await submitRegistrationAction(token, appendPatientFormData(data));
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error ?? "Registration failed");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    const data = getValues();
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500/5 to-background p-4">
        <Card className="max-w-md w-full rounded-2xl border-border/80">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="rounded-full bg-green-500/10 p-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-xl font-bold">Registration Complete!</h1>
            <p className="text-sm text-muted-foreground">
              Thank you, {data.first_name}! Your information has been saved.
              Please proceed to the reception desk.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-500/5 to-background p-4">
      <div className="max-w-3xl w-full space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-cyan-600">
            <User className="h-5 w-5" />
            <h1 className="text-xl font-bold">Patient Registration</h1>
          </div>
          {patientName && (
            <p className="text-sm text-muted-foreground">Welcome, {patientName}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {tabIndex + 1} of {TABS.length}: {TABS[tabIndex]}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs w-full">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                activeTab === tab
                  ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Card className="rounded-2xl border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{activeTab}</CardTitle>
            </CardHeader>
            <CardContent>
              {activeTab === "Personal Info" && <PatientFormPersonalSection register={register} errors={errors} />}
              {activeTab === "Dental History" && <PatientFormDentalHistorySection register={register} />}
              {activeTab === "Medical History" && (
                <div className="space-y-4">
                  <PatientFormMedicalQuestionsSection register={register} />
                  <PatientFormAllergyConditionsSection register={register} watch={watch} setValue={setValue} conditions={conditions} />
                </div>
              )}
              {activeTab === "Review" && (
                <ReviewSection data={getValues()} conditions={conditions} />
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            {tabIndex > 0 && (
              <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting} className="h-9 rounded-xl text-xs">
                <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
                Back
              </Button>
            )}
            {activeTab !== "Review" ? (
              <Button type="button" onClick={handleNext} className="h-9 rounded-xl text-xs bg-cyan-600 hover:bg-cyan-700 text-white font-semibold">
                Next
                <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting} className="h-9 rounded-xl text-xs bg-cyan-600 hover:bg-cyan-700 text-white font-semibold">
                {isSubmitting ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Submitting...</>
                ) : (
                  <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Submit Registration</>
                )}
              </Button>
            )}
          </div>
        </form>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-cyan-600" />
          <p>
            Your information is protected under the Data Privacy Act of 2012 (RA 10173)
            and will only be used for your dental care.
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewSection({ data, conditions }: { data: PatientFormData; conditions: MedicalCondition[] }) {
  const selectedConditions = conditions.filter((c) => data.condition_ids?.includes(c.id));

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-muted/30 border border-border/40 p-4 space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase">Personal Information</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <ReviewItem label="Name" value={`${data.first_name} ${data.last_name}`} />
          {data.middle_name && <ReviewItem label="Middle Name" value={data.middle_name} />}
          {data.birth_date && <ReviewItem label="Birthdate" value={data.birth_date} />}
          {data.sex && <ReviewItem label="Sex" value={data.sex === "M" ? "Male" : "Female"} />}
          <ReviewItem label="Contact" value={data.contact_no} />
          {data.email && <ReviewItem label="Email" value={data.email} />}
          {data.occupation && <ReviewItem label="Occupation" value={data.occupation} />}
          {data.nationality && <ReviewItem label="Nationality" value={data.nationality} />}
        </dl>
      </div>

      {(data.previous_dentist || data.last_dental_visit) && (
        <div className="rounded-xl bg-muted/30 border border-border/40 p-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">Dental History</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {data.previous_dentist && <ReviewItem label="Previous Dentist" value={data.previous_dentist} />}
            {data.last_dental_visit && <ReviewItem label="Last Dental Visit" value={data.last_dental_visit} />}
          </dl>
        </div>
      )}

      {(data.physician_name || data.medical_history || data.allergies || selectedConditions.length > 0) && (
        <div className="rounded-xl bg-muted/30 border border-border/40 p-4 space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">Medical History</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {data.physician_name && <ReviewItem label="Physician" value={data.physician_name} />}
            {data.medical_history && <ReviewItem label="Medical History" value={data.medical_history} />}
            {data.allergies && <ReviewItem label="Allergies" value={data.allergies} />}
          </dl>
          {selectedConditions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedConditions.map((c) => (
                <span key={c.id} className="inline-flex items-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 text-[11px] font-semibold px-2 py-0.5">
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-cyan-600" />
        <p>
          Please review your information above. By submitting, you confirm that the details
          provided are accurate to the best of your knowledge.
        </p>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-[11px]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
