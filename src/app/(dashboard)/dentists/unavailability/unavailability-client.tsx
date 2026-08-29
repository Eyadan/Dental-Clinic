"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarX, AlertTriangle, CheckCircle2, Loader2, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getDentistsAction,
  getAffectedAppointmentsAction,
  findAlternateDentistsAction,
  declareUnavailabilityAction,
  reassignAppointmentAction,
  getCurrentStaffIdAction,
  type DentistOption,
} from "./actions";
import type { AffectedAppointment, AlternateDentist } from "@/lib/services/reassignment-service";
import type { BlockType } from "@/lib/types/enums";

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: "vacation", label: "Vacation" },
  { value: "sick_leave", label: "Sick Leave" },
  { value: "break", label: "Break" },
  { value: "other", label: "Other" },
];

export default function UnavailabilityClient() {
  const [dentists, setDentists] = useState<DentistOption[]>([]);
  const [selectedDentistId, setSelectedDentistId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [blockType, setBlockType] = useState<string>("vacation");
  const [reason, setReason] = useState<string>("");
  const [affectedAppointments, setAffectedAppointments] = useState<AffectedAppointment[]>([]);
  const [isLoadingDentists, setIsLoadingDentists] = useState(true);
  const [isLoadingAffected, setIsLoadingAffected] = useState(false);
  const [isDeclaring, setIsDeclaring] = useState(false);
  const [staffId, setStaffId] = useState<string>("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassigningAppointment, setReassigningAppointment] = useState<AffectedAppointment | null>(null);
  const [alternateDentists, setAlternateDentists] = useState<AlternateDentist[]>([]);
  const [selectedAlternateDentistId, setSelectedAlternateDentistId] = useState<string>("");
  const [selectedNewDate, setSelectedNewDate] = useState<string>("");
  const [selectedNewTime, setSelectedNewTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [isLoadingAlternates, setIsLoadingAlternates] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      const [dentistsResult, staffResult] = await Promise.all([
        getDentistsAction(),
        getCurrentStaffIdAction(),
      ]);
      if (dentistsResult.success && dentistsResult.data) {
        setDentists(dentistsResult.data);
      }
      if (staffResult.success && staffResult.data) {
        setStaffId(staffResult.data);
      }
      setIsLoadingDentists(false);
    };
    loadInitialData();
  }, []);

  const handleCheckAffected = useCallback(async () => {
    if (!selectedDentistId || !startDate || !endDate) return;
    setIsLoadingAffected(true);
    setNotification(null);
    const result = await getAffectedAppointmentsAction(selectedDentistId, startDate, endDate);
    if (result.success && result.data) {
      setAffectedAppointments(result.data);
    } else {
      setNotification({ type: "error", message: result.error ?? "Failed to fetch appointments" });
    }
    setIsLoadingAffected(false);
  }, [selectedDentistId, startDate, endDate]);

  const handleDeclareUnavailability = async () => {
    if (!selectedDentistId || !startDate || !endDate || !reason || !staffId) return;
    setIsDeclaring(true);
    setNotification(null);
    const result = await declareUnavailabilityAction(
      selectedDentistId,
      startDate,
      endDate,
      blockType,
      reason,
      staffId,
    );
    if (result.success) {
      setNotification({
        type: "success",
        message: `Unavailability declared. ${result.data?.affectedCount ?? 0} appointment(s) marked for reschedule.`,
      });
      setAffectedAppointments([]);
      setReason("");
      await handleCheckAffected();
    } else {
      setNotification({ type: "error", message: result.error ?? "Failed to declare unavailability" });
    }
    setIsDeclaring(false);
  };

  const handleOpenReassign = async (appointment: AffectedAppointment) => {
    setReassigningAppointment(appointment);
    setReassignDialogOpen(true);
    setSelectedAlternateDentistId("");
    setSelectedNewDate(appointment.scheduled_date);
    setSelectedNewTime("");
    setAvailableSlots([]);
    setAlternateDentists([]);
    setIsLoadingAlternates(true);

    const result = await findAlternateDentistsAction(
      selectedDentistId,
      appointment.scheduled_date,
      appointment.total_duration,
    );
    if (result.success && result.data) {
      setAlternateDentists(result.data);
    }
    setIsLoadingAlternates(false);
  };

  const handleSelectAlternateDentist = (dentistId: string) => {
    setSelectedAlternateDentistId(dentistId);
    const dentist = alternateDentists.find((d) => d.id === dentistId);
    setAvailableSlots(dentist?.available_slots ?? []);
    setSelectedNewTime("");
  };

  const handleConfirmReassign = async () => {
    if (!reassigningAppointment || !selectedAlternateDentistId || !selectedNewDate || !selectedNewTime || !staffId) return;
    setIsReassigning(true);
    const result = await reassignAppointmentAction(
      reassigningAppointment.id,
      selectedAlternateDentistId,
      selectedNewDate,
      selectedNewTime,
      `Dentist unavailability: ${reason || "N/A"}`,
      staffId,
    );
    if (result.success) {
      setNotification({
        type: "success",
        message: `Appointment ${reassigningAppointment.reference_no} reassigned successfully.`,
      });
      setReassignDialogOpen(false);
      setReassigningAppointment(null);
      await handleCheckAffected();
    } else {
      setNotification({ type: "error", message: result.error ?? "Failed to reassign" });
    }
    setIsReassigning(false);
  };

  if (isLoadingDentists) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dentist Unavailability</h1>
        <p className="text-sm text-muted-foreground">
          Declare unavailability and reassign affected appointments to alternate dentists.
        </p>
      </div>

      {notification && (
        <Alert variant={notification.type === "error" ? "destructive" : "default"}>
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarX className="h-5 w-5" />
            Declare Unavailability
          </CardTitle>
          <CardDescription>Select a dentist and date range to check affected appointments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dentist">Dentist</Label>
              <Select value={selectedDentistId} onValueChange={(v) => { setSelectedDentistId(v ?? ""); setAffectedAppointments([]); }}>
                <SelectTrigger id="dentist">
                  <SelectValue placeholder="Select dentist" />
                </SelectTrigger>
                <SelectContent>
                  {dentists.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} {d.specialization ? `— ${d.specialization}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blockType">Block Type</Label>
              <Select value={blockType} onValueChange={(v) => setBlockType(v ?? "vacation")}>
                <SelectTrigger id="blockType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOCK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setAffectedAppointments([]); }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setAffectedAppointments([]); }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Reason for unavailability..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCheckAffected}
              disabled={!selectedDentistId || !startDate || !endDate || isLoadingAffected}
            >
              {isLoadingAffected ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...</>
              ) : (
                "Check Affected Appointments"
              )}
            </Button>
            <Button
              onClick={handleDeclareUnavailability}
              disabled={!selectedDentistId || !startDate || !endDate || !reason || isDeclaring}
            >
              {isDeclaring ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Declaring...</>
              ) : (
                "Declare Unavailability"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {affectedAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Affected Appointments ({affectedAppointments.length})
            </CardTitle>
            <CardDescription>Reassign each appointment to an alternate dentist.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {affectedAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{appt.reference_no}</span>
                      <Badge variant="outline">{appt.booking_status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {appt.patient_name} — {appt.scheduled_date} at {appt.scheduled_time}
                      {" "}({appt.total_duration} min)
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleOpenReassign(appt)}>
                    Reassign <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {affectedAppointments.length === 0 && selectedDentistId && startDate && endDate && !isLoadingAffected && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="mb-3 h-10 w-10 text-green-500" />
            <p className="text-sm text-muted-foreground">No affected appointments in this date range.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reassign Appointment</DialogTitle>
            <DialogDescription>
              {reassigningAppointment && `Reassigning ${reassigningAppointment.reference_no} — ${reassigningAppointment.patient_name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoadingAlternates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : alternateDentists.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No alternate dentists with available slots found for this date. Try a different date.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Alternate Dentist</Label>
                  <Select value={selectedAlternateDentistId} onValueChange={(v) => v && handleSelectAlternateDentist(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select alternate dentist" />
                    </SelectTrigger>
                    <SelectContent>
                      {alternateDentists.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.dentist_name} {d.specialization ? `— ${d.specialization}` : ""} ({d.available_slots.length} slots)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newDate">New Date</Label>
                  <Input
                    id="newDate"
                    type="date"
                    value={selectedNewDate}
                    onChange={(e) => {
                      setSelectedNewDate(e.target.value);
                      setSelectedNewTime("");
                      setAvailableSlots([]);
                    }}
                  />
                </div>

                {availableSlots.length > 0 && (
                  <div className="space-y-2">
                    <Label>Available Time Slots</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.startTime}
                          variant={selectedNewTime === slot.startTime ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedNewTime(slot.startTime)}
                        >
                          {slot.startTime}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAlternateDentistId && availableSlots.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No available slots for the selected date. Choose a different date.
                  </p>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReassign}
              disabled={!selectedAlternateDentistId || !selectedNewDate || !selectedNewTime || isReassigning}
            >
              {isReassigning ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reassigning...</>
              ) : (
                <>Confirm Reassignment</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
