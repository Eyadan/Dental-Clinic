"use client";

import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PatientFormData } from "@/lib/validations/patient.schema";

interface Props {
  register: UseFormRegister<PatientFormData>;
  errors: FieldErrors<PatientFormData>;
}

export function PatientFormPersonalSection({ register, errors }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Last Name *</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("last_name")} />
          {errors.last_name && <p className="text-[11px] text-destructive">{errors.last_name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">First Name *</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("first_name")} />
          {errors.first_name && <p className="text-[11px] text-destructive">{errors.first_name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Middle Name</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("middle_name")} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Birthdate</Label>
          <Input type="date" className="h-10 text-xs rounded-xl" {...register("birth_date")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Sex</Label>
          <select className="h-10 w-full text-xs rounded-xl border border-input bg-transparent px-3" {...register("sex")}>
            <option value="">—</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Nickname</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("nickname")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Nationality</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("nationality")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Religion</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("religion")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Occupation</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("occupation")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">Home Address</Label>
        <Textarea rows={2} className="text-xs rounded-xl" {...register("home_address")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Mobile Number *</Label>
          <Input placeholder="09171234567" className="h-10 text-xs rounded-xl" {...register("contact_no")} />
          {errors.contact_no && <p className="text-[11px] text-destructive">{errors.contact_no.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Email Address</Label>
          <Input type="email" className="h-10 text-xs rounded-xl" {...register("email")} />
          {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Home No.</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("home_no")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Office No.</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("office_no")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Fax No.</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("fax_no")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Dental Insurance</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("dental_insurance")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Insurance Effective Date</Label>
          <Input type="date" className="h-10 text-xs rounded-xl" {...register("insurance_effective_date")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
        <div className="col-span-2 text-[11px] font-bold text-muted-foreground uppercase">For Minors</div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Parent/Guardian&apos;s Name</Label>
          <Input className="h-10 text-xs rounded-xl bg-background" {...register("guardian_name")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Guardian&apos;s Occupation</Label>
          <Input className="h-10 text-xs rounded-xl bg-background" {...register("guardian_occupation")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Whom may we thank for referring you?</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("referred_by")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Reason for Dental Consultation</Label>
          <Input className="h-10 text-xs rounded-xl" {...register("consultation_reason")} />
        </div>
      </div>
    </div>
  );
}
