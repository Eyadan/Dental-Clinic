"use client";

import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PatientFormData } from "@/lib/validations/patient.schema";
import { User, Phone, Mail, MapPin, ShieldCheck, HeartPulse } from "lucide-react";

interface Props {
  register: UseFormRegister<PatientFormData>;
  errors: FieldErrors<PatientFormData>;
}

export function PatientFormPersonalSection({ register, errors }: Props) {
  return (
    <div className="space-y-5">
      {/* SECTION 1: PERSONAL IDENTIFICATION */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3.5 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <User className="h-4 w-4 text-cyan-600" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Personal Identification</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Last Name *</Label>
            <Input placeholder="e.g. Dela Cruz" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("last_name")} />
            {errors.last_name && <p className="text-[11px] font-semibold text-destructive">{errors.last_name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">First Name *</Label>
            <Input placeholder="e.g. Juan" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("first_name")} />
            {errors.first_name && <p className="text-[11px] font-semibold text-destructive">{errors.first_name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Middle Name</Label>
            <Input placeholder="e.g. Santos" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("middle_name")} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Birthdate</Label>
            <Input type="date" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("birth_date")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Sex</Label>
            <select className="h-10 w-full text-xs rounded-xl border border-border/80 bg-background px-3 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500" {...register("sex")}>
              <option value="">Select sex</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Nickname</Label>
            <Input placeholder="e.g. Johnny" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("nickname")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Nationality</Label>
            <Input placeholder="e.g. Filipino" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("nationality")} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Religion</Label>
            <Input placeholder="e.g. Roman Catholic" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("religion")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Occupation</Label>
            <Input placeholder="e.g. Engineer / Student" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("occupation")} />
          </div>
        </div>
      </div>

      {/* SECTION 2: CONTACT DETAILS & ADDRESS */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3.5 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <Phone className="h-4 w-4 text-teal-600" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Contact & Address</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Phone className="h-3 w-3 text-cyan-600" /> Mobile Number *
            </Label>
            <Input placeholder="09171234567" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500 font-mono" {...register("contact_no")} />
            {errors.contact_no && <p className="text-[11px] font-semibold text-destructive">{errors.contact_no.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3 text-cyan-600" /> Email Address
            </Label>
            <Input type="email" placeholder="patient@example.com" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("email")} />
            {errors.email && <p className="text-[11px] font-semibold text-destructive">{errors.email.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3 text-cyan-600" /> Complete Home Address
          </Label>
          <Textarea rows={2} placeholder="House/Unit No., Street, Barangay, City, Province" className="text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("home_address")} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Home Tel No.</Label>
            <Input placeholder="e.g. (02) 8123-4567" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("home_no")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Office Tel No.</Label>
            <Input placeholder="e.g. (02) 8888-0000" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("office_no")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Fax No.</Label>
            <Input placeholder="e.g. (02) 8888-0001" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("fax_no")} />
          </div>
        </div>
      </div>

      {/* SECTION 3: INSURANCE & MINOR GUARDIAN */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3.5 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Insurance & Emergency Guardian</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Dental Insurance / HMO Provider</Label>
            <Input placeholder="e.g. Maxicare / Intellicare / PhilCare" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("dental_insurance")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Insurance Effective Date</Label>
            <Input type="date" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("insurance_effective_date")} />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-2.5">
          <span className="text-[10px] font-extrabold text-cyan-600 uppercase tracking-wider bg-cyan-500/10 px-2 py-0.5 rounded-md">
            For Minors (Under 18 Years)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Parent / Guardian&apos;s Full Name</Label>
              <Input placeholder="Parent or legal guardian name" className="h-10 text-xs rounded-xl border-border/80 bg-background focus-visible:ring-cyan-500" {...register("guardian_name")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Guardian&apos;s Occupation</Label>
              <Input placeholder="Guardian occupation" className="h-10 text-xs rounded-xl border-border/80 bg-background focus-visible:ring-cyan-500" {...register("guardian_occupation")} />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: REFERRAL & REASON */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3.5 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <HeartPulse className="h-4 w-4 text-purple-600" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Referral & Consultation Reason</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Whom may we thank for referring you?</Label>
            <Input placeholder="e.g. Dr. Santos / Facebook / Friend" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("referred_by")} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Reason for Dental Consultation</Label>
            <Input placeholder="e.g. Toothache, Cleaning, Braces consult" className="h-10 text-xs rounded-xl border-border/80 focus-visible:ring-cyan-500" {...register("consultation_reason")} />
          </div>
        </div>
      </div>
    </div>
  );
}

