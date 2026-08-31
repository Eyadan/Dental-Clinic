"use client";

import type { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PatientFormData } from "@/lib/validations/patient.schema";

interface Props {
  register: UseFormRegister<PatientFormData>;
}

export function PatientFormDentalHistorySection({ register }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">Previous Dentist</Label>
        <Input placeholder="Dr. ..." className="h-10 text-xs rounded-xl" {...register("previous_dentist")} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">Last Dental Visit</Label>
        <Input type="date" className="h-10 text-xs rounded-xl" {...register("last_dental_visit")} />
      </div>
    </div>
  );
}
