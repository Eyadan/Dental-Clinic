"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { callNextAction, callSpecificAction, markDelayedAction, markNoShowAction, moveToLaterSlotAction } from "./actions";
import { Loader2, UserCheck, Users, Clock, ChevronRight, ClockAlert, UserX, CalendarClock } from "lucide-react";
import { PageHeroBanner } from "@/components/shared/page-hero-banner";
import { TimePicker } from "@/components/ui/time-picker";

interface QueueItem {
  id: string;
  reference_no: string;
  scheduled_time: string;
  total_duration: number;
  visit_status: string;
  booking_status: string;
  patient_name: string;
  dentist_name: string;
}

interface QueueClientProps {
  items: QueueItem[];
}

const VISIT_STATUS_COLORS: Record<string, string> = {
  checked_in: "bg-blue-100 text-blue-700 border-blue-200",
  waiting: "bg-amber-100 text-amber-700 border-amber-200",
  delayed: "bg-orange-100 text-orange-700 border-orange-200",
  in_consultation: "bg-purple-100 text-purple-700 border-purple-200",
  treatment_ongoing: "bg-teal-100 text-teal-700 border-teal-200",
  treatment_paused: "bg-orange-100 text-orange-700 border-orange-200",
};

const VISIT_STATUS_LABELS: Record<string, string> = {
  checked_in: "Checked In",
  waiting: "Called",
  delayed: "Delayed",
  in_consultation: "In Consultation",
  treatment_ongoing: "Treatment Ongoing",
  treatment_paused: "Treatment Paused",
};

export function QueueClient({ items: initialItems }: QueueClientProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveAppointmentId, setMoveAppointmentId] = useState<string | null>(null);
  const [newSlotTime, setNewSlotTime] = useState<string>("");
  const [isMoving, setIsMoving] = useState(false);

  const refreshQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch {
      // Silent fail — polling fallback
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshQueue, 5000);
    return () => clearInterval(interval);
  }, [refreshQueue]);

  const handleCallNext = async () => {
    setIsCallingNext(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await callNextAction();
      if (result.success && result.data) {
        setSuccess(`Called: ${result.data.patientName}`);
        setItems((prev) =>
          prev.map((item) =>
            item.id === result.data!.id ? { ...item, visit_status: "waiting" } : item,
          ),
        );
        router.refresh();
      } else {
        setError(result.error ?? "Failed to call next patient");
      }
    } finally {
      setIsCallingNext(false);
    }
  };

  const handleCallSpecific = async (appointmentId: string) => {
    setPendingId(appointmentId);
    setError(null);
    setSuccess(null);

    try {
      const result = await callSpecificAction(appointmentId);
      if (result.success && result.data) {
        setSuccess(`Called: ${result.data.patientName}`);
        setItems((prev) =>
          prev.map((item) =>
            item.id === appointmentId ? { ...item, visit_status: "waiting" } : item,
          ),
        );
        router.refresh();
      } else {
        setError(result.error ?? "Failed to call patient");
      }
    } finally {
      setPendingId(null);
    }
  };

  const handleMarkDelayed = async (appointmentId: string) => {
    setPendingId(appointmentId);
    setError(null);
    setSuccess(null);

    try {
      const result = await markDelayedAction(appointmentId);
      if (result.success) {
        setSuccess("Patient marked as delayed");
        setItems((prev) =>
          prev.map((item) =>
            item.id === appointmentId ? { ...item, visit_status: "delayed" } : item,
          ),
        );
        router.refresh();
      } else {
        setError(result.error ?? "Failed to mark as delayed");
      }
    } finally {
      setPendingId(null);
    }
  };

  const handleMarkNoShow = async (appointmentId: string) => {
    setPendingId(appointmentId);
    setError(null);
    setSuccess(null);

    try {
      const result = await markNoShowAction(appointmentId);
      if (result.success) {
        setSuccess("Patient marked as no-show");
        setItems((prev) => prev.filter((item) => item.id !== appointmentId));
        router.refresh();
      } else {
        setError(result.error ?? "Failed to mark as no-show");
      }
    } finally {
      setPendingId(null);
    }
  };

  const handleOpenMoveDialog = (appointmentId: string) => {
    setMoveAppointmentId(appointmentId);
    setNewSlotTime("");
    setMoveDialogOpen(true);
  };

  const handleConfirmMove = async () => {
    if (!moveAppointmentId || !newSlotTime) return;
    setIsMoving(true);
    setError(null);

    try {
      const result = await moveToLaterSlotAction(moveAppointmentId, newSlotTime);
      if (result.success) {
        setSuccess("Patient moved to later slot");
        setItems((prev) =>
          prev.map((item) =>
            item.id === moveAppointmentId
              ? { ...item, scheduled_time: newSlotTime, visit_status: "checked_in" }
              : item,
          ),
        );
        setMoveDialogOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to move to later slot");
      }
    } finally {
      setIsMoving(false);
    }
  };

  const waitingCount = items.filter((i) => i.visit_status === "checked_in").length;
  const calledCount = items.filter((i) => i.visit_status === "waiting").length;
  const inProgressCount = items.filter((i) =>
    ["in_consultation", "treatment_ongoing", "treatment_paused"].includes(i.visit_status),
  ).length;

  return (
    <div className="space-y-6">
      {/* LIGHT SaaS HERO HEADER */}
      <PageHeroBanner
        icon={Users}
        title="Live Clinic Queue"
        description="Manage patient calling, delays, and consultation routing for today"
        badgeText="Realtime Dispatch"
      >
        <Button
          onClick={handleCallNext}
          disabled={isCallingNext || waitingCount === 0}
          size="sm"
          className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs"
        >
          {isCallingNext ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserCheck className="mr-1.5 h-3.5 w-3.5" />
          )}
          Call Next Patient
        </Button>
      </PageHeroBanner>

      {error && (
        <Alert variant="destructive" className="rounded-2xl border-rose-500/30 bg-rose-500/10 text-rose-300">
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="rounded-2xl border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
          <AlertDescription className="text-xs font-semibold">{success}</AlertDescription>
        </Alert>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="stat-card-glow p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground font-mono">{waitingCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Waiting in Lobby</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card-glow p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground font-mono">{calledCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Called to Operatory</p>
            </div>
          </div>
        </Card>
        <Card className="stat-card-glow p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground font-mono">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Currently In Treatment</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-3" role="region" aria-label="Patient queue" aria-live="polite">
        {items.length === 0 ? (
          <div className="card-premium py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-muted-foreground">No patients currently in queue</p>
          </div>
        ) : (
          items.map((item, index) => (
            <Card key={item.id} className="card-premium">
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-mono font-bold text-sm">
                    #{index + 1}
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-foreground">{item.patient_name}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span>Ref: {item.reference_no}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-cyan-500" />
                        {item.scheduled_time}
                      </span>
                      <span className="font-sans text-foreground/80">{item.dentist_name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`font-semibold text-xs px-2.5 py-1 ${VISIT_STATUS_COLORS[item.visit_status] ?? ""}`}
                  >
                    {VISIT_STATUS_LABELS[item.visit_status] ?? item.visit_status}
                  </Badge>

                  {item.visit_status === "checked_in" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleCallSpecific(item.id)}
                        disabled={pendingId === item.id}
                        className="h-8 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
                      >
                        {pendingId === item.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ChevronRight className="mr-1 h-3.5 w-3.5" />
                        )}
                        Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkDelayed(item.id)}
                        disabled={pendingId === item.id}
                        className="h-8 rounded-lg border-border/60 text-xs"
                      >
                        <ClockAlert className="mr-1 h-3.5 w-3.5 text-amber-500" />
                        Delay
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenMoveDialog(item.id)}
                        disabled={pendingId === item.id}
                        className="h-8 rounded-lg border-border/60 text-xs"
                      >
                        <CalendarClock className="mr-1 h-3.5 w-3.5 text-cyan-500" />
                        Move
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs"
                        onClick={() => handleMarkNoShow(item.id)}
                        disabled={pendingId === item.id}
                      >
                        {pendingId === item.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserX className="mr-1 h-3.5 w-3" />
                        )}
                        No-Show
                      </Button>
                    </>
                  )}
                  {item.visit_status === "delayed" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleCallSpecific(item.id)}
                        disabled={pendingId === item.id}
                        className="h-8 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
                      >
                        {pendingId === item.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ChevronRight className="mr-1 h-3.5 w-3.5" />
                        )}
                        Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenMoveDialog(item.id)}
                        disabled={pendingId === item.id}
                        className="h-8 rounded-lg border-border/60 text-xs"
                      >
                        <CalendarClock className="mr-1 h-3.5 w-3.5 text-cyan-500" />
                        Move
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs"
                        onClick={() => handleMarkNoShow(item.id)}
                        disabled={pendingId === item.id}
                      >
                        {pendingId === item.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserX className="mr-1 h-3.5 w-3" />
                        )}
                        No-Show
                      </Button>
                    </>
                  )}
                  {item.visit_status === "waiting" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkDelayed(item.id)}
                        disabled={pendingId === item.id}
                        className="h-8 rounded-lg border-border/60 text-xs"
                      >
                        <ClockAlert className="mr-1 h-3.5 w-3.5 text-amber-500" />
                        Delay
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs"
                        onClick={() => handleMarkNoShow(item.id)}
                        disabled={pendingId === item.id}
                      >
                        {pendingId === item.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserX className="mr-1 h-3.5 w-3" />
                        )}
                        No-Show
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="rounded-2xl border-border/80 bg-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Move to Later Slot</DialogTitle>
            <DialogDescription className="text-xs">
              Assign the patient to a later time slot today. The patient will be moved back to "Checked In" status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="newSlotTime" className="text-xs font-semibold">New Time Slot</Label>
              <TimePicker
                id="newSlotTime"
                value={newSlotTime}
                onChange={(val) => setNewSlotTime(val)}
                placeholder="Pick new time..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)} className="rounded-xl text-xs h-9">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMove}
              disabled={!newSlotTime || isMoving}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs h-9"
            >
              {isMoving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Moving...</>
              ) : (
                "Confirm Move"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
