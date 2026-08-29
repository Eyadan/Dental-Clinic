"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Clock, Calendar, Search } from "lucide-react";
import type { Patient } from "@/lib/types/database";
import type { Dentist } from "@/lib/types/database";
import type { DentalService } from "@/lib/types/database";
import { getAvailableSlotsAction } from "@/app/(dashboard)/appointments/actions";

type Slot = { startTime: string; endTime: string; available: boolean };

interface AppointmentFormProps {
  patients: Patient[];
  dentists: Dentist[];
  services: DentalService[];
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string; data?: { id: string; reference_no: string } }>;
}

export function AppointmentForm({ patients, dentists, services, onSubmit }: AppointmentFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [dentistId, setDentistId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const selectedPatient = useMemo(() => patients.find((p) => p.id === patientId) ?? null, [patients, patientId]);
  const selectedDentist = useMemo(() => dentists.find((d) => d.id === dentistId) ?? null, [dentists, dentistId]);

  const totalDuration = useMemo(() => {
    return services
      .filter((s) => selectedServiceIds.includes(s.id))
      .reduce((sum, s) => sum + s.default_duration_minutes, 0);
  }, [selectedServiceIds, services]);

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    setSelectedServiceIds((prev) =>
      checked ? [...prev, serviceId] : prev.filter((id) => id !== serviceId),
    );
  };

  const handlePatientChange = (value: string | null) => setPatientId(value);
  const handleDentistChange = (value: string | null) => setDentistId(value);

  const handleCheckSlots = () => {
    if (!dentistId || totalDuration === 0) return;
    const dateInput = document.getElementById("scheduled_date") as HTMLInputElement | null;
    if (!dateInput?.value) return;

    setIsLoadingSlots(true);
    setSlots([]);
    startTransition(async () => {
      const result = await getAvailableSlotsAction(dentistId, dateInput.value, totalDuration);
      setIsLoadingSlots(false);
      if (result.success && result.data) {
        setSlots(result.data);
      }
    });
  };

  const handleSelectSlot = (time: string) => {
    const timeInput = document.getElementById("scheduled_time") as HTMLInputElement | null;
    if (timeInput) timeInput.value = time;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!patientId) {
      setError("Please select a patient");
      return;
    }
    if (!dentistId) {
      setError("Please select a dentist");
      return;
    }
    if (selectedServiceIds.length === 0) {
      setError("Please select at least one service");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("patient_id", patientId);
    formData.set("dentist_id", dentistId);
    formData.set("total_duration", String(totalDuration));
    selectedServiceIds.forEach((id) => formData.append("service_ids", id));

    startTransition(async () => {
      const result = await onSubmit(formData);
      if (!result.success) {
        setError(result.error ?? "Failed to create appointment");
      } else {
        setSuccess(`Appointment created! Reference: ${result.data?.reference_no}`);
        setSelectedServiceIds([]);
        setPatientId(null);
        setDentistId(null);
      }
    });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Patient & Dentist</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="patient">Patient</Label>
            <Select value={patientId ?? ""} onValueChange={handlePatientChange}>
              <SelectTrigger id="patient">
                <SelectValue placeholder="Select patient">
                  {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name} · ${selectedPatient.contact_no}` : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} — {p.contact_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="patient_id" value={patientId ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dentist">Dentist</Label>
            <Select value={dentistId ?? ""} onValueChange={handleDentistChange}>
              <SelectTrigger id="dentist">
                <SelectValue placeholder="Select dentist">
                  {selectedDentist ? `${selectedDentist.full_name ?? selectedDentist.license_no}${selectedDentist.specialization ? ` · ${selectedDentist.specialization}` : ""}` : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {dentists.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.full_name ?? d.license_no}{d.specialization ? ` · ${d.specialization}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="dentist_id" value={dentistId ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Date & Time</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="scheduled_date">
              <Calendar className="mr-1 inline h-4 w-4" />
              Date
            </Label>
            <Input
              id="scheduled_date"
              type="date"
              name="scheduled_date"
              min={today}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduled_time">
              <Clock className="mr-1 inline h-4 w-4" />
              Time
            </Label>
            <Input
              id="scheduled_time"
              type="time"
              name="scheduled_time"
              defaultValue="09:00"
              required
            />
          </div>
          {dentistId && totalDuration > 0 && (
            <div className="col-span-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCheckSlots}
                disabled={isLoadingSlots}
              >
                {isLoadingSlots ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Check Available Slots
              </Button>
            </div>
          )}
          {slots.length > 0 && (
            <div className="col-span-full">
              <p className="text-sm text-muted-foreground mb-2">Available slots (click to select):</p>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <Button
                    key={slot.startTime}
                    type="button"
                    variant={slot.available ? "outline" : "ghost"}
                    size="sm"
                    disabled={!slot.available}
                    onClick={() => handleSelectSlot(slot.startTime)}
                    className={!slot.available ? "line-through opacity-50" : ""}
                  >
                    {slot.startTime}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Services {totalDuration > 0 && `(${totalDuration} min total)`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {services.length === 0 ? (
            <p className="text-muted-foreground">No active services available</p>
          ) : (
            services.map((service) => (
              <div key={service.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`service-${service.id}`}
                    checked={selectedServiceIds.includes(service.id)}
                    onCheckedChange={(checked: boolean) =>
                      handleServiceToggle(service.id, checked)
                    }
                  />
                  <div>
                    <Label htmlFor={`service-${service.id}`} className="font-medium">
                      {service.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {service.description ?? "No description"} · {service.default_duration_minutes} min
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Appointment
        </Button>
      </div>
    </form>
  );
}
