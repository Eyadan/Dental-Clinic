"use client";

import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import type { PatientFormData } from "@/lib/validations/patient.schema";
import { Sparkles, Calendar, Stethoscope, AlertCircle } from "lucide-react";

interface Props {
  register: UseFormRegister<PatientFormData>;
  setValue?: UseFormSetValue<PatientFormData>;
  watch?: UseFormWatch<PatientFormData>;
}

export function PatientFormDentalHistorySection({ register, setValue, watch }: Props) {
  return (
    <div className="space-y-4">
      {/* SECTION 1: PREVIOUS DENTAL CARE */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3.5 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <Stethoscope className="h-4 w-4 text-cyan-600" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Previous Dental Care History</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Previous Attending Dentist / Clinic</Label>
            <Input placeholder="e.g. Dr. Juan Cruz / City Dental Clinic" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("previous_dentist")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Last Dental Visit Date</Label>
            <DatePicker
              value={watch ? watch("last_dental_visit") || "" : ""}
              onChange={(val) => setValue?.("last_dental_visit", val)}
              placeholder="Pick last visit date..."
              align="right"
            />
            <input type="hidden" {...register("last_dental_visit")} />
          </div>
        </div>
      </div>

      {/* SECTION 2: DENTAL CONCERNS & SYMPTOMS */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3.5 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Dental Symptoms & Sensitivities</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Primary Dental Complaint</Label>
            <Input placeholder="e.g. Toothache on lower molar, bleeding gums, aesthetic whitening" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("consultation_reason")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Previous Dental Complications / Bad Reactions</Label>
            <Input placeholder="e.g. Excessive bleeding after extraction, fainting from anesthesia" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("medical_history")} />
          </div>
        </div>
      </div>

      {/* SECTION 3: ORAL HYGIENE SUMMARY */}
      <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-600" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Routine Dental Checkup Note</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Comprehensive dental charts, periapical X-ray findings, periodontal pocket depths, and tooth condition histories will be recorded directly during the patient&apos;s clinical consultation.
        </p>
      </div>
    </div>
  );
}

