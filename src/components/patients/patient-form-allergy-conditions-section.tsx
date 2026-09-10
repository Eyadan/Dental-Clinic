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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ALLERGY_ITEMS.map((item) => (
            <label key={item.field} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-card hover:bg-muted/30 text-xs font-medium cursor-pointer transition-colors shadow-2xs">
              <input type="checkbox" className="h-4 w-4 rounded accent-cyan-600 cursor-pointer" {...register(item.field)} />
              {item.label}
            </label>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Other Allergies</Label>
          <Input placeholder="Specify other allergies (e.g. Seafood, Dust, Pollen)..." className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("allergy_others")} />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">
          Do you have or have you had any of the following? (Medical Conditions Checklist)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1 border border-border/60 rounded-2xl bg-card">
          {conditions.map((condition) => (
            <label
              key={condition.id}
              className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium cursor-pointer border transition-colors ${
                selectedIds.includes(condition.id)
                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-900 dark:text-cyan-200"
                  : "bg-muted/20 border-border/40 hover:bg-muted/40 text-foreground"
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-cyan-600 shrink-0 cursor-pointer"
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
