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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Queue Management</h1>
          <p className="text-muted-foreground">Real-time patient queue for today</p>
        </div>
        <Button onClick={handleCallNext} disabled={isCallingNext || waitingCount === 0} size="lg">
          {isCallingNext ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserCheck className="mr-2 h-4 w-4" />
          )}
          Call Next
        </Button>
      </div>

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-100 p-2">
              <Users className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{waitingCount}</p>
              <p className="text-xs text-muted-foreground">Waiting</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-100 p-2">
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{calledCount}</p>
              <p className="text-xs text-muted-foreground">Called</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-purple-100 p-2">
              <UserCheck className="h-5 w-5 text-purple-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3" role="region" aria-label="Patient queue" aria-live="polite">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No patients in queue</p>
          </div>
        ) : (
          items.map((item, index) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">{item.patient_name}</div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>Ref: {item.reference_no}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.scheduled_time}
                      </span>
                      <span>{item.dentist_name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={VISIT_STATUS_COLORS[item.visit_status] ?? ""}
                  >
                    {VISIT_STATUS_LABELS[item.visit_status] ?? item.visit_status}
                  </Badge>
                  {item.visit_status === "checked_in" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCallSpecific(item.id)}
                        disabled={pendingId === item.id}
                      >
                        {pendingId === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <ChevronRight className="mr-1 h-3 w-3" />
                        )}
                        Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkDelayed(item.id)}
                        disabled={pendingId === item.id}
                      >
                        <ClockAlert className="mr-1 h-3 w-3" />
                        Delay
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenMoveDialog(item.id)}
                        disabled={pendingId === item.id}
                      >
                        <CalendarClock className="mr-1 h-3 w-3" />
                        Move
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleMarkNoShow(item.id)}
                        disabled={pendingId === item.id}
                      >
                        {pendingId === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <UserX className="mr-1 h-3 w-3" />
                        )}
                        No-Show
                      </Button>
                    </>
                  )}
                  {item.visit_status === "delayed" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCallSpecific(item.id)}
                        disabled={pendingId === item.id}
                      >
                        {pendingId === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <ChevronRight className="mr-1 h-3 w-3" />
                        )}
                        Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenMoveDialog(item.id)}
                        disabled={pendingId === item.id}
                      >
                        <CalendarClock className="mr-1 h-3 w-3" />
                        Move
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleMarkNoShow(item.id)}
                        disabled={pendingId === item.id}
                      >
                        {pendingId === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <UserX className="mr-1 h-3 w-3" />
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
                      >
                        <ClockAlert className="mr-1 h-3 w-3" />
                        Delay
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleMarkNoShow(item.id)}
                        disabled={pendingId === item.id}
                      >
                        {pendingId === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <UserX className="mr-1 h-3 w-3" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Later Slot</DialogTitle>
            <DialogDescription>
              Assign the patient to a later time slot today. The patient will be moved back to "Checked In" status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newSlotTime">New Time Slot</Label>
              <Input
                id="newSlotTime"
                type="time"
                value={newSlotTime}
                onChange={(e) => setNewSlotTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMove}
              disabled={!newSlotTime || isMoving}
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
