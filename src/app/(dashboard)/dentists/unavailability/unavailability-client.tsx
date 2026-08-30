"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarX, AlertTriangle, CheckCircle2, Loader2, ArrowRight, User, Stethoscope, Lock, Clock, Save, Calendar, Check, Trash2, ShieldAlert } from "lucide-react";
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
  getCurrentDentistInfoAction,
  getWeeklyScheduleAction,
  saveWeeklyScheduleAction,
  getDentistBlocksAction,
  deleteDentistBlockAction,
  type DentistOption,
  type WeeklyScheduleDay,
} from "./actions";
import type { AffectedAppointment, AlternateDentist } from "@/lib/services/reassignment-service";
import type { BlockType } from "@/lib/types/enums";
import type { DentistBlock } from "@/lib/types/database";

const BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: "vacation", label: "Vacation" },
  { value: "sick_leave", label: "Sick Leave" },
  { value: "break", label: "Break" },
  { value: "other", label: "Other" },
];

export default function UnavailabilityClient() {
  const [dentists, setDentists] = useState<DentistOption[]>([]);
  const [selectedDentistId, setSelectedDentistId] = useState<string>("");
  const [isDentistRole, setIsDentistRole] = useState(false);
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

  // Weekly Schedule State
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleDay[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Declared Leave Blocks State
  const [declaredBlocks, setDeclaredBlocks] = useState<DentistBlock[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);

  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassigningAppointment, setReassigningAppointment] = useState<AffectedAppointment | null>(null);
  const [alternateDentists, setAlternateDentists] = useState<AlternateDentist[]>([]);
  const [selectedAlternateDentistId, setSelectedAlternateDentistId] = useState<string>("");
  const [selectedNewDate, setSelectedNewDate] = useState<string>("");
  const [selectedNewTime, setSelectedNewTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [isLoadingAlternates, setIsLoadingAlternates] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  const loadWeeklySchedule = useCallback(async (dentistId: string) => {
    if (!dentistId) return;
    setIsLoadingSchedule(true);
    const res = await getWeeklyScheduleAction(dentistId);
    if (res.success && res.data) {
      setWeeklySchedule(res.data);
    }
    setIsLoadingSchedule(false);
  }, []);

  const loadDeclaredBlocks = useCallback(async (dentistId: string) => {
    if (!dentistId) return;
    setIsLoadingBlocks(true);
    const res = await getDentistBlocksAction(dentistId);
    if (res.success && res.data) {
      setDeclaredBlocks(res.data);
    }
    setIsLoadingBlocks(false);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      const [dentistsResult, staffResult, infoResult] = await Promise.all([
        getDentistsAction(),
        getCurrentStaffIdAction(),
        getCurrentDentistInfoAction(),
      ]);

      if (dentistsResult.success && dentistsResult.data) {
        setDentists(dentistsResult.data);
      }
      if (staffResult.success && staffResult.data) {
        setStaffId(staffResult.data);
      }

      let activeDentistId = "";
      if (infoResult.success && infoResult.data) {
        if (infoResult.data.role === "dentist" && infoResult.data.currentDentistId) {
          setIsDentistRole(true);
          activeDentistId = infoResult.data.currentDentistId;
          setSelectedDentistId(activeDentistId);
        } else if (dentistsResult.data && dentistsResult.data.length > 0) {
          activeDentistId = dentistsResult.data[0].id;
          setSelectedDentistId(activeDentistId);
        }
      }

      if (activeDentistId) {
        await Promise.all([
          loadWeeklySchedule(activeDentistId),
          loadDeclaredBlocks(activeDentistId),
        ]);
      }

      setIsLoadingDentists(false);
    };
    loadInitialData();
  }, [loadWeeklySchedule, loadDeclaredBlocks]);

  const handleDentistChange = async (dentistId: string) => {
    setSelectedDentistId(dentistId);
    setAffectedAppointments([]);
    await Promise.all([
      loadWeeklySchedule(dentistId),
      loadDeclaredBlocks(dentistId),
    ]);
  };

  const handleDayToggle = (dayOfWeek: number, isActive: boolean) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, is_active: isActive } : d))
    );
  };

  const handleTimeChange = (dayOfWeek: number, field: "start_time" | "end_time", value: string) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d))
    );
  };

  const handleSaveWeeklySchedule = async () => {
    if (!selectedDentistId) return;
    setIsSavingSchedule(true);
    setNotification(null);
    const res = await saveWeeklyScheduleAction(selectedDentistId, weeklySchedule);
    if (res.success) {
      setNotification({
        type: "success",
        message: "Weekly working hours updated successfully!",
      });
    } else {
      setNotification({
        type: "error",
        message: res.error ?? "Failed to update work hours",
      });
    }
    setIsSavingSchedule(false);
  };

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
    if (!selectedDentistId || !startDate || !endDate || !reason) return;
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
      const dentistName = dentists.find((d) => d.id === selectedDentistId)?.name || "Dentist";
      setNotification({
        type: "success",
        message: `✅ Temporary leave declared successfully for ${dentistName} (${startDate} to ${endDate})! ${result.data?.affectedCount ?? 0} appointment(s) marked for reschedule.`,
      });
      setAffectedAppointments([]);
      setReason("");
      await Promise.all([
        handleCheckAffected(),
        loadDeclaredBlocks(selectedDentistId),
      ]);
    } else {
      setNotification({ type: "error", message: result.error ?? "Failed to declare unavailability" });
    }
    setIsDeclaring(false);
  };

  const handleDeleteBlock = async (blockId: string) => {
    setDeletingBlockId(blockId);
    setNotification(null);
    const res = await deleteDentistBlockAction(blockId);
    if (res.success) {
      setNotification({
        type: "success",
        message: "Leave block removed successfully.",
      });
      await loadDeclaredBlocks(selectedDentistId);
    } else {
      setNotification({
        type: "error",
        message: res.error ?? "Failed to remove leave block",
      });
    }
    setDeletingBlockId(null);
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
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <CalendarX className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Dentist Schedule & Unavailability</h1>
              {isDentistRole && (
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 bg-cyan-500/10 text-[10px] font-bold">
                  <Lock className="mr-1 h-3 w-3" /> My Account Leave & Shift
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Manage weekly working hours, declare dentist leave, and reassign affected patient appointments</p>
          </div>
        </div>

        {!isDentistRole && (
          <div className="w-full sm:w-64">
            <Label className="text-[11px] font-bold text-muted-foreground uppercase mb-1 block">Selected Doctor</Label>
            <Select value={selectedDentistId} onValueChange={(v) => handleDentistChange(v ?? "")}>
              <SelectTrigger className="h-10 text-xs border-border/80 rounded-xl bg-background">
                <SelectValue placeholder="Select doctor..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {dentists.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.name} {d.specialization ? `— ${d.specialization}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* PROMINENT TOP NOTIFICATION ALERT */}
      {notification && (
        <Alert
          className={`rounded-2xl border shadow-sm p-4 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300"
          }`}
        >
          <div className="flex items-start gap-3">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            )}
            <AlertDescription className="text-xs font-bold leading-relaxed">{notification.message}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* WEEKLY WORK HOURS EDITOR CARD */}
      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
        <CardHeader className="border-b border-border/40 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-600" />
              Weekly Work Shift Hours
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Set active work days and start/end operating times for each day of the week.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={handleSaveWeeklySchedule}
            disabled={isSavingSchedule || isLoadingSchedule || !selectedDentistId}
            className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            {isSavingSchedule ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            Save Work Hours
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {isLoadingSchedule ? (
            <div className="flex py-8 justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
              {weeklySchedule.map((day) => (
                <div
                  key={day.day_of_week}
                  className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                    day.is_active
                      ? "border-cyan-500/30 bg-cyan-500/5 shadow-xs"
                      : "border-border/60 bg-muted/20 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">{day.day_name}</span>
                    <button
                      type="button"
                      onClick={() => handleDayToggle(day.day_of_week, !day.is_active)}
                      className={`h-5 w-5 rounded-md flex items-center justify-center transition-colors ${
                        day.is_active
                          ? "bg-cyan-600 text-white shadow-xs"
                          : "border border-border/80 bg-background text-transparent"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </button>
                  </div>

                  {day.is_active ? (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground font-semibold">Start Time</Label>
                        <Input
                          type="time"
                          value={day.start_time}
                          onChange={(e) => handleTimeChange(day.day_of_week, "start_time", e.target.value)}
                          className="h-8 text-xs font-mono rounded-lg border-border/80"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground font-semibold">End Time</Label>
                        <Input
                          type="time"
                          value={day.end_time}
                          onChange={(e) => handleTimeChange(day.day_of_week, "end_time", e.target.value)}
                          className="h-8 text-xs font-mono rounded-lg border-border/80"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <Badge variant="outline" className="border-border text-muted-foreground text-[10px] font-medium">
                        Off Duty
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* DECLARE LEAVE / UNAVAILABILITY CARD */}
      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-amber-500" />
            Declare Temporary Leave / Block Dates
          </CardTitle>
          <CardDescription className="text-xs">
            Submit vacation, sick leave, or temporary clinic absence to auto-detect and reassign affected patient appointments.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dentist" className="text-xs font-semibold text-muted-foreground">Dentist Account</Label>
              <Select
                value={selectedDentistId}
                disabled={isDentistRole}
                onValueChange={(v) => handleDentistChange(v ?? "")}
              >
                <SelectTrigger id="dentist" className="h-10 text-xs border-border/80 rounded-xl disabled:opacity-90 disabled:bg-muted/40">
                  <SelectValue placeholder="Select dentist">
                    {dentists.find((d) => d.id === selectedDentistId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {dentists.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs">
                      {d.name} {d.specialization ? `— ${d.specialization}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="blockType" className="text-xs font-semibold text-muted-foreground">Leave / Block Type</Label>
              <Select value={blockType} onValueChange={(v) => setBlockType(v ?? "vacation")}>
                <SelectTrigger id="blockType" className="h-10 text-xs border-border/80 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {BLOCK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-xs font-semibold text-muted-foreground">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setAffectedAppointments([]); }}
                className="h-10 text-xs border-border/80 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-xs font-semibold text-muted-foreground">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setAffectedAppointments([]); }}
                className="h-10 text-xs border-border/80 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs font-semibold text-muted-foreground">Reason for Unavailability *</Label>
            <Textarea
              id="reason"
              placeholder="Provide reason for declaring unavailability..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="text-xs border-border/80 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckAffected}
              disabled={!selectedDentistId || !startDate || !endDate || isLoadingAffected}
              className="h-9 rounded-xl text-xs border-border/80"
            >
              {isLoadingAffected ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Check Affected Appointments
            </Button>
            <Button
              size="sm"
              onClick={handleDeclareUnavailability}
              disabled={!selectedDentistId || !startDate || !endDate || !reason || isDeclaring}
              className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              {isDeclaring ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CalendarX className="mr-1.5 h-3.5 w-3.5" />}
              Declare Unavailability
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DECLARED LEAVE & BLOCK HISTORY CARD */}
      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-600" />
              Active Declared Leave Records ({declaredBlocks.length})
            </span>
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 bg-cyan-500/10 text-[10px]">
              Active Leave Blocks
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            History of declared vacation, sick leave, and unavailability date blocks for this doctor.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {isLoadingBlocks ? (
            <div className="flex py-6 justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
            </div>
          ) : declaredBlocks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No active leave blocks declared for this doctor.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {declaredBlocks.map((b) => (
                <div key={b.id} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2 text-xs flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px] uppercase font-bold">
                        {b.block_type.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(b.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="font-bold text-foreground flex items-center gap-1.5 pt-1">
                      <Calendar className="h-3.5 w-3.5 text-cyan-600" />
                      <span>{b.start_datetime.slice(0, 10)} to {b.end_datetime.slice(0, 10)}</span>
                    </div>
                    {b.reason && (
                      <p className="text-[11px] text-muted-foreground italic bg-background p-2 rounded-lg border border-border/40">
                        "{b.reason}"
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deletingBlockId === b.id}
                    onClick={() => handleDeleteBlock(b.id)}
                    className="h-8 rounded-xl text-[11px] border-red-500/20 text-red-600 hover:bg-red-500/10 font-semibold w-full mt-2"
                  >
                    {deletingBlockId === b.id ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1.5 h-3 w-3" />
                    )}
                    Remove Block
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AFFECTED APPOINTMENTS CARD */}
      {affectedAppointments.length > 0 && (
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Affected Appointments ({affectedAppointments.length})</span>
              <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-[10px]">
                Requires Reassignment
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {affectedAppointments.map((appt) => (
              <div key={appt.id} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{appt.patient_name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Ref: {appt.reference_no}</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Scheduled: <span className="font-semibold text-foreground">{appt.scheduled_date} at {appt.scheduled_time}</span> ({appt.total_duration}m)
                  </p>
                </div>
                <Button size="sm" onClick={() => handleOpenReassign(appt)} className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shrink-0 shadow-xs">
                  Reassign Dentist <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* REASSIGNMENT DIALOG */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/80">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Reassign Appointment</DialogTitle>
            <DialogDescription className="text-xs">
              Reassign patient {reassigningAppointment?.patient_name} to an available dentist.
            </DialogDescription>
          </DialogHeader>

          {isLoadingAlternates ? (
            <div className="flex py-8 justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
            </div>
          ) : (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Select Alternate Dentist</Label>
                <Select value={selectedAlternateDentistId} onValueChange={(v) => handleSelectAlternateDentist(v ?? "")}>
                  <SelectTrigger className="h-10 text-xs border-border/80 rounded-xl">
                    <SelectValue placeholder="Choose dentist..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {alternateDentists.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.dentist_name} ({d.specialization}) — {d.available_slots.length} available slots
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAlternateDentistId && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Select Time Slot</Label>
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.startTime}
                        type="button"
                        onClick={() => setSelectedNewTime(slot.startTime)}
                        className={`p-2 rounded-xl border text-center text-xs font-semibold transition-all ${
                          selectedNewTime === slot.startTime
                            ? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
                            : "border-border/80 text-foreground hover:bg-muted/40"
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReassignDialogOpen(false)} className="rounded-xl text-xs">Cancel</Button>
            <Button
              size="sm"
              onClick={handleConfirmReassign}
              disabled={!selectedAlternateDentistId || !selectedNewTime || isReassigning}
              className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              {isReassigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Reassignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
