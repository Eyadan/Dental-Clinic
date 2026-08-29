"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { approveAppointmentAction, declineAppointmentAction } from "../appointments/actions";
import { confirmCancellationAction, denyCancellationAction, rescheduleAppointmentAction } from "./actions";
import { Check, X, Clock, Loader2, CalendarClock, Ban } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

interface Booking {
  id: string;
  reference_no: string;
  patient_name: string;
  patient_contact: string;
  booking_status: string;
  scheduled_date: string;
  scheduled_time: string;
  total_duration: number;
  created_at: string;
}

interface BookingDashboardClientProps {
  bookings: Booking[];
  activeFilter: string;
}

const STATUS_FILTERS = [
  { value: "pending", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "reschedule_required", label: "Reschedule Required" },
  { value: "pending_cancellation", label: "Pending Cancellation" },
  { value: "all", label: "All" },
];

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending Review", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  confirmed: { label: "Confirmed", variant: "default" },
  declined: { label: "Declined", variant: "destructive" },
  expired: { label: "Expired", variant: "outline" },
  reschedule_required: { label: "Reschedule Required", variant: "secondary" },
  pending_cancellation: { label: "Pending Cancellation", variant: "destructive" },
  rescheduled: { label: "Rescheduled", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export function BookingDashboardClient({ bookings, activeFilter }: BookingDashboardClientProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [denyAppointmentId, setDenyAppointmentId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState<string>("");
  const [isDenying, setIsDenying] = useState(false);

  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState<string>("");
  const [newTime, setNewTime] = useState<string>("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  const handleApprove = (id: string) => {
    setPendingId(id);
    setError(null);
    startTransition(async () => {
      const result = await approveAppointmentAction(id);
      setPendingId(null);
      if (!result.success) {
        setError(result.error ?? "Failed to approve");
      } else {
        router.refresh();
      }
    });
  };

  const handleDecline = (id: string) => {
    setPendingId(id);
    setError(null);
    startTransition(async () => {
      const result = await declineAppointmentAction(id);
      setPendingId(null);
      if (!result.success) {
        setError(result.error ?? "Failed to decline");
      } else {
        router.refresh();
      }
    });
  };

  const handleConfirmCancellation = (id: string) => {
    setPendingId(id);
    setError(null);
    startTransition(async () => {
      const result = await confirmCancellationAction(id);
      setPendingId(null);
      if (!result.success) {
        setError(result.error ?? "Failed to confirm cancellation");
      } else {
        router.refresh();
      }
    });
  };

  const handleOpenDenyDialog = (id: string) => {
    setDenyAppointmentId(id);
    setDenyReason("");
    setDenyDialogOpen(true);
  };

  const handleConfirmDeny = async () => {
    if (!denyAppointmentId || !denyReason) return;
    setIsDenying(true);
    setError(null);
    const result = await denyCancellationAction(denyAppointmentId, denyReason);
    setIsDenying(false);
    if (!result.success) {
      setError(result.error ?? "Failed to deny cancellation");
    } else {
      setDenyDialogOpen(false);
      router.refresh();
    }
  };

  const handleOpenRescheduleDialog = (id: string, currentDate: string, currentTime: string) => {
    setRescheduleAppointmentId(id);
    setNewDate(currentDate);
    setNewTime(currentTime.slice(0, 5));
    setRescheduleDialogOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleAppointmentId || !newDate || !newTime) return;
    setIsRescheduling(true);
    setError(null);
    const result = await rescheduleAppointmentAction(rescheduleAppointmentId, newDate, newTime);
    setIsRescheduling(false);
    if (!result.success) {
      setError(result.error ?? "Failed to reschedule");
    } else {
      setRescheduleDialogOpen(false);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Booking Dashboard</h1>
        <p className="text-muted-foreground">Review and process booking requests</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`/bookings${filter.value !== "pending" ? `?status=${filter.value}` : ""}`}
          >
            <Button
              variant={activeFilter === filter.value ? "default" : "outline"}
              size="sm"
            >
              {filter.label}
            </Button>
          </Link>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No bookings to review</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const badge = STATUS_BADGES[booking.booking_status] ?? {
              label: booking.booking_status,
              variant: "outline" as const,
            };
            const elapsed = Date.now() - new Date(booking.created_at).getTime();
            const elapsedHours = Math.floor(elapsed / (1000 * 60 * 60));
            const elapsedMin = Math.floor(elapsed / (1000 * 60)) % 60;

            return (
              <Card key={booking.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{booking.patient_name}</span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Ref: {booking.reference_no}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {booking.scheduled_date} at {booking.scheduled_time}
                      </span>
                      <span>{booking.total_duration} min</span>
                      {elapsedHours > 0 || elapsedMin > 0 ? (
                        <span className="text-xs">
                          {elapsedHours > 0 ? `${elapsedHours}h ` : ""}{elapsedMin}m ago
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {booking.booking_status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(booking.id)}
                        disabled={pendingId === booking.id}
                      >
                        {pendingId === booking.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecline(booking.id)}
                        disabled={pendingId === booking.id}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  )}
                  {booking.booking_status === "pending_cancellation" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleConfirmCancellation(booking.id)}
                        disabled={pendingId === booking.id}
                      >
                        {pendingId === booking.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Confirm Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDenyDialog(booking.id)}
                        disabled={pendingId === booking.id}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Deny
                      </Button>
                    </div>
                  )}
                  {booking.booking_status === "reschedule_required" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleOpenRescheduleDialog(booking.id, booking.scheduled_date, booking.scheduled_time)}
                        disabled={pendingId === booking.id}
                      >
                        <CalendarClock className="mr-2 h-4 w-4" />
                        Reschedule
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Cancellation Request</DialogTitle>
            <DialogDescription>
              The patient will be notified that their cancellation request was denied with the reason provided.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="denyReason">Reason for Denial</Label>
              <Textarea
                id="denyReason"
                placeholder="e.g., Cancellation period has passed, please call the clinic..."
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmDeny} disabled={!denyReason || isDenying}>
              {isDenying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Denying...</> : "Confirm Denial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time for this appointment. The patient will be notified with the new schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newDate">New Date</Label>
                <Input
                  id="newDate"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newTime">New Time</Label>
                <Input
                  id="newTime"
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmReschedule} disabled={!newDate || !newTime || isRescheduling}>
              {isRescheduling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rescheduling...</> : "Confirm Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
