"use client";

import type { UseFormRegister, UseFormWatch, UseFormSetValue } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PatientFormData } from "@/lib/validations/patient.schema";
import type { MedicalCondition } from "@/lib/types/database";

interface Props {
  register: UseFormRegister<PatientFormData>;
  watch: UseFormWatch<PatientFormData>;
  setValue: UseFormSetValue<PatientFormData>;
  conditions: MedicalCondition[];
}

const ALLERGY_ITEMS: { field: keyof PatientFormData; label: string }[] = [
  { field: "allergy_local_anesthetic", label: "Local Anesthetic (e.g. Lidocaine)" },
  { field: "allergy_penicillin_antibiotics", label: "Penicillin / Antibiotics" },
  { field: "allergy_sulfa_drugs", label: "Sulfa Drugs" },
  { field: "allergy_aspirin", label: "Aspirin" },
  { field: "allergy_latex", label: "Latex" },
];

export function PatientFormAllergyConditionsSection({ register, watch, setValue, conditions }: Props) {
  const selectedIds = watch("condition_ids") ?? [];

  const toggleCondition = (id: string) => {
    const current = watch("condition_ids") ?? [];
    setValue(
      "condition_ids",
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">Allergic to any of the following?</p>
        <div className="grid grid-cols-2 gap-2">
          {ALLERGY_ITEMS.map((item) => (
            <label key={item.field} className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 text-xs font-medium cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-cyan-600" {...register(item.field)} />
              {item.label}
            </label>
          ))}
        </div>
        <div className="mt-2 space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Other Allergies</Label>
          <Input placeholder="Specify others..." className="h-9 text-xs rounded-xl" {...register("allergy_others")} />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">
          Do you have or have you had any of the following?
        </p>
        <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto p-1">
          {conditions.map((condition) => (
            <label
              key={condition.id}
              className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/30 text-[11px] font-medium cursor-pointer hover:bg-cyan-500/10"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-cyan-600 shrink-0"
                checked={selectedIds.includes(condition.id)}
                onChange={() => toggleCondition(condition.id)}
              />
              <span className="truncate">{condition.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
