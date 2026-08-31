"use client";

import type { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PatientFormData } from "@/lib/validations/patient.schema";

interface Props {
  register: UseFormRegister<PatientFormData>;
}

function YesNoRow({
  label,
  field,
  detailField,
  register,
}: {
  label: string;
  field: keyof PatientFormData;
  detailField?: keyof PatientFormData;
  register: UseFormRegister<PatientFormData>;
}) {
  return (
    <div className="p-2.5 rounded-xl bg-muted/30 space-y-1.5">
      <label className="flex items-center justify-between text-xs font-medium text-foreground cursor-pointer">
        <span>{label}</span>
        <input type="checkbox" className="h-4 w-4 accent-cyan-600" {...register(field)} />
      </label>
      {detailField && (
        <Input placeholder="If so, please specify..." className="h-8 text-[11px] rounded-lg bg-background" {...register(detailField)} />
      )}
    </div>
  );
}

export function PatientFormMedicalQuestionsSection({ register }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Name of Physician</Label>
          <Input placeholder="Dr. ..." className="h-10 text-xs rounded-xl" {...register("physician_name")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Specialty (if applicable)</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("physician_specialty")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Office Address</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("physician_office_address")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Office Number</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("physician_office_no")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <YesNoRow label="Are you in good health?" field="is_in_good_health" register={register} />
        <YesNoRow label="Are you under medical treatment now?" field="is_under_medical_treatment" detailField="medical_treatment_condition" register={register} />
        <YesNoRow label="Serious illness or surgical operation?" field="had_serious_illness_or_surgery" detailField="illness_or_surgery_details" register={register} />
        <YesNoRow label="Have you ever been hospitalized?" field="was_hospitalized" detailField="hospitalization_details" register={register} />
        <YesNoRow label="Taking prescription/non-prescription medication?" field="taking_medication" detailField="medication_details" register={register} />
        <YesNoRow label="Do you use tobacco products?" field="uses_tobacco" register={register} />
        <YesNoRow label="Do you use alcohol, cocaine, or other drugs?" field="uses_alcohol_or_drugs" register={register} />
        <YesNoRow label="Are you pregnant?" field="is_pregnant" register={register} />
        <YesNoRow label="Are you nursing?" field="is_nursing" register={register} />
        <YesNoRow label="Taking birth control pills?" field="taking_birth_control" register={register} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Bleeding Time</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("bleeding_time")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Blood Type</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("blood_type")} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Blood Pressure</Label>
          <Input placeholder="120/80" className="h-10 text-xs rounded-xl" {...register("blood_pressure")} />
        </div>
      </div>
    </div>
  );
}
