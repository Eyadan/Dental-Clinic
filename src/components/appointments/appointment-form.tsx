"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Clock, Calendar, Search, User, Stethoscope, Layers, CheckCircle2, CalendarPlus, Check, Sparkles } from "lucide-react";
import type { Patient } from "@/lib/types/database";
import type { Dentist } from "@/lib/types/database";
import type { DentalService } from "@/lib/types/database";
import { getAvailableSlotsAction } from "@/app/(dashboard)/appointments/actions";
import { todayLocal } from "@/lib/utils/date-utils";

type Slot = { startTime: string; endTime: string; available: boolean };

interface AppointmentFormProps {
  patients: Patient[];
  dentists: Dentist[];
  services: DentalService[];
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string; data?: { id: string; reference_no: string } }>;
  currentUserRole?: string | null;
  currentDentistId?: string | null;
}

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AppointmentForm({ patients, dentists, services, onSubmit, currentUserRole, currentDentistId }: AppointmentFormProps) {
  const isDentistRole = currentUserRole === "dentist";
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [dentistId, setDentistId] = useState<string | null>(() => {
    return isDentistRole && currentDentistId ? currentDentistId : (dentists.length === 1 ? dentists[0].id : null);
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [isVerballyApproved, setIsVerballyApproved] = useState(false);

  const effectiveDentistId = isDentistRole && currentDentistId ? currentDentistId : dentistId;
  const selectedPatient = useMemo(() => patients.find((p) => p.id === patientId) ?? null, [patients, patientId]);
  const selectedDentist = useMemo(() => dentists.find((d) => d.id === effectiveDentistId) ?? null, [dentists, effectiveDentistId]);

  const totalDuration = useMemo(() => {
    return services
      .filter((s) => selectedServiceIds.includes(s.id))
      .reduce((sum, s) => sum + s.default_duration_minutes, 0);
  }, [selectedServiceIds, services]);

  const totalPrice = useMemo(() => {
    return services
      .filter((s) => selectedServiceIds.includes(s.id))
      .reduce((sum, s) => sum + s.default_price, 0);
  }, [selectedServiceIds, services]);

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    );
  };

  const handlePatientChange = (value: string | null) => setPatientId(value);
  const handleDentistChange = (value: string | null) => setDentistId(value);

  const handleCheckSlots = () => {
    const targetDentistId = effectiveDentistId;
    if (!targetDentistId || totalDuration === 0) return;
    const dateInput = document.getElementById("scheduled_date") as HTMLInputElement | null;
    if (!dateInput?.value) return;

    setIsLoadingSlots(true);
    setSlots([]);
    startTransition(async () => {
      const result = await getAvailableSlotsAction(targetDentistId, dateInput.value, totalDuration);
      setIsLoadingSlots(false);
      if (result.success && result.data) {
        setSlots(result.data);
      }
    });
  };

  const handleSelectSlot = (time: string) => {
    setSelectedTime(time);
    const timeInput = document.getElementById("scheduled_time") as HTMLInputElement | null;
    if (timeInput) timeInput.value = time;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const targetDentistId = effectiveDentistId;

    if (!patientId) {
      setError("Please select a patient");
      return;
    }
    if (!targetDentistId) {
      setError("Please select a dentist");
      return;
    }
    if (selectedServiceIds.length === 0) {
      setError("Please select at least one service");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("patient_id", patientId);
    formData.set("dentist_id", targetDentistId);
    formData.set("scheduled_time", selectedTime);
    formData.set("total_duration", String(totalDuration));
    formData.set("isVerballyApproved", isDentistRole ? "true" : (isVerballyApproved ? "true" : "false"));
    selectedServiceIds.forEach((id) => formData.append("service_ids", id));

    startTransition(async () => {
      const result = await onSubmit(formData);
      if (!result.success) {
        setError(result.error ?? "Failed to create appointment");
      } else {
        setSuccess(`Appointment created successfully! Reference: ${result.data?.reference_no}`);
        setSelectedServiceIds([]);
        setPatientId(null);
        setDentistId(null);
      }
    });
  };

  const today = todayLocal();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive" className="rounded-2xl border-red-500/20 bg-red-500/5">
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="rounded-2xl border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <AlertDescription className="text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {success}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* PATIENT & DENTIST SELECTION */}
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
          <CardHeader className="border-b border-border/40 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-600" /> Patient & Dentist Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="patient" className="text-xs font-semibold text-muted-foreground">Select Patient *</Label>
              <Select value={patientId ?? ""} onValueChange={handlePatientChange}>
                <SelectTrigger id="patient" className="w-full h-10 text-xs border-border/80 rounded-xl">
                  <SelectValue placeholder="Search or select patient...">
                    {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name} · ${selectedPatient.contact_no}` : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[var(--anchor-width)] min-w-[var(--anchor-width)] rounded-xl p-1">
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                      {p.first_name} {p.last_name} — {p.contact_no}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isDentistRole ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Attending Dentist</Label>
                <div className="flex items-center justify-between p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-cyan-600 shrink-0" />
                    <span className="text-xs font-bold text-foreground">
                      {selectedDentist ? `${selectedDentist.full_name ?? selectedDentist.license_no}${selectedDentist.specialization ? ` · ${selectedDentist.specialization}` : ""}` : "Attending Dentist"}
                    </span>
                  </div>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 bg-cyan-500/10 font-mono text-[10px]">
                    YOUR SCHEDULE (LOCKED)
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="dentist" className="text-xs font-semibold text-muted-foreground">Select Attending Dentist *</Label>
                <Select value={effectiveDentistId ?? ""} onValueChange={handleDentistChange}>
                  <SelectTrigger id="dentist" className="w-full h-10 text-xs border-border/80 rounded-xl">
                    <SelectValue placeholder="Choose dentist...">
                      {selectedDentist ? `${selectedDentist.full_name ?? selectedDentist.license_no}${selectedDentist.specialization ? ` · ${selectedDentist.specialization}` : ""}` : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="w-[var(--anchor-width)] min-w-[var(--anchor-width)] rounded-xl p-1">
                    {dentists.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs font-medium">
                        {d.full_name ?? d.license_no}{d.specialization ? ` · ${d.specialization}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* VERBAL PRE-APPROVAL TOGGLE (ONLY FOR RECEPTION / ADMIN) */}
            {!isDentistRole && (
              <div className="pt-2 border-t border-border/40">
                <label htmlFor="verbally_approved_checkbox" className="flex items-start gap-2.5 p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    id="verbally_approved_checkbox"
                    checked={isVerballyApproved}
                    onChange={(e) => setIsVerballyApproved(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-cyan-600 focus:ring-cyan-500 border-border cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Pre-Approved by Attending Dentist
                      <Badge variant="outline" className={`text-[10px] ${isVerballyApproved ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-amber-500/10 text-amber-700 border-amber-500/30"}`}>
                        {isVerballyApproved ? "APPROVED IMMEDIATELY" : "REQUIRES DENTIST APPROVAL"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Check this if the attending dentist has verbally confirmed schedule availability for this patient.
                    </p>
                  </div>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DATE & TIME SELECTION */}
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
          <CardHeader className="border-b border-border/40 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-600" /> Schedule Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="scheduled_date" className="text-xs font-semibold text-muted-foreground">Scheduled Date *</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  name="scheduled_date"
                  min={today}
                  defaultValue={today}
                  required
                  className="h-10 text-xs border-border/80 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="scheduled_time" className="text-xs font-semibold text-muted-foreground">Scheduled Time *</Label>
                <Input
                  id="scheduled_time"
                  type="time"
                  name="scheduled_time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  required
                  className="h-10 text-xs border-border/80 rounded-xl"
                />
              </div>
            </div>

            {dentistId && totalDuration > 0 && (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckSlots}
                  disabled={isLoadingSlots}
                  className="h-8 rounded-xl text-xs border-border/80 hover:bg-cyan-500/10 hover:text-cyan-600 font-semibold"
                >
                  {isLoadingSlots ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Check Available Time Slots ({totalDuration} min)
                </Button>
              </div>
            )}

            {slots.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase">Available Dentist Slots</Label>
                <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto">
                  {slots.map((slot) => (
                    <button
                      key={slot.startTime}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => handleSelectSlot(slot.startTime)}
                      className={`p-1.5 rounded-lg border text-center font-mono text-[11px] font-bold transition-all ${
                        selectedTime === slot.startTime
                          ? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
                          : slot.available
                          ? "border-border/80 text-foreground hover:bg-muted/40"
                          : "border-border/40 text-muted-foreground opacity-40 cursor-not-allowed"
                      }`}
                    >
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DENTAL PROCEDURES SELECTION — FULLY HIGHLIGHTED CLICKABLE PILLS */}
      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
        <CardHeader className="border-b border-border/40 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-600" />
            <CardTitle className="text-sm font-bold">Select Dental Services & Procedures</CardTitle>
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 bg-cyan-500/10 text-[10px] font-bold">
              {selectedServiceIds.length} selected
            </Badge>
          </div>

          <div className="flex items-center gap-2.5 text-xs font-mono bg-muted/40 p-2 rounded-xl border border-border/40">
            <span className="text-muted-foreground">Duration: <strong className="text-foreground font-bold">{totalDuration} mins</strong></span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Est. Total: <strong className="text-cyan-600 font-bold">{formatPeso(totalPrice)}</strong></span>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-3 font-medium">Click any procedure pill below to select or deselect it:</p>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id);
              return (
                <div
                  key={service.id}
                  onClick={() => handleServiceToggle(service.id)}
                  className={`group relative flex flex-col justify-between p-4 rounded-2xl cursor-pointer transition-all duration-150 select-none ${
                    isSelected
                      ? "bg-gradient-to-br from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-500/25 border-2 border-cyan-500 scale-[1.01]"
                      : "bg-card border border-border/80 hover:border-cyan-500/60 hover:bg-cyan-500/5 text-foreground"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-bold text-sm ${isSelected ? "text-white" : "text-foreground group-hover:text-cyan-600"}`}>
                        {service.name}
                      </p>
                      {isSelected ? (
                        <Badge className="bg-white/20 hover:bg-white/20 text-white font-mono text-[10px] font-bold border border-white/30 shrink-0">
                          <Check className="mr-1 h-3 w-3 stroke-[3]" /> SELECTED
                        </Badge>
                      ) : (
                        <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 shrink-0 bg-cyan-600/10 px-2 py-0.5 rounded-lg border border-cyan-600/20">
                          {formatPeso(service.default_price)}
                        </span>
                      )}
                    </div>

                    {service.description && (
                      <p className={`text-xs line-clamp-2 leading-relaxed ${isSelected ? "text-cyan-50 opacity-90" : "text-muted-foreground"}`}>
                        {service.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 flex items-center justify-between mt-1">
                    <span className={`inline-flex items-center text-[11px] font-mono font-medium gap-1 px-2 py-0.5 rounded-lg ${
                      isSelected ? "bg-white/15 text-white border border-white/20" : "bg-muted text-muted-foreground"
                    }`}>
                      <Clock className="h-3 w-3" />
                      {service.default_duration_minutes} mins
                    </span>

                    {isSelected && (
                      <span className="font-mono text-xs font-extrabold text-white">
                        {formatPeso(service.default_price)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending || !patientId || !dentistId || selectedServiceIds.length === 0}
          className="h-10 px-6 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-[0.98] transition-transform"
        >
          {isPending ? (
            <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Scheduling Appointment...</>
          ) : (
            <><CalendarPlus className="mr-1.5 h-4 w-4" /> Book Appointment</>
          )}
        </Button>
      </div>
    </form>
  );
}
