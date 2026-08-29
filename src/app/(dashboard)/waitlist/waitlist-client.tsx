"use client";

import { useState, useEffect, useCallback } from "react";
import { ListPlus, Clock, Check, X, Bell, Loader2, CalendarDays, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getWaitlistAction,
  getReleasedSlotsAction,
  joinWaitlistAction,
  leaveWaitlistAction,
  notifyNextAction,
  acceptWaitlistSlotAction,
  declineWaitlistAction,
  getPatientsAction,
  getServicesAction,
} from "./actions";
import type { WaitlistEntryWithPatient, ReleasedSlot } from "@/lib/services/waitlist-service";

export default function WaitlistClient() {
  const [waitlist, setWaitlist] = useState<WaitlistEntryWithPatient[]>([]);
  const [releasedSlots, setReleasedSlots] = useState<ReleasedSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinPatientId, setJoinPatientId] = useState<string>("");
  const [joinDate, setJoinDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isJoining, setIsJoining] = useState(false);

  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [acceptEntry, setAcceptEntry] = useState<WaitlistEntryWithPatient | null>(null);
  const [acceptSlot, setAcceptSlot] = useState<ReleasedSlot | null>(null);
  const [acceptServiceId, setAcceptServiceId] = useState<string>("");
  const [isAccepting, setIsAccepting] = useState(false);

  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [waitlistResult, slotsResult, patientsResult, servicesResult] = await Promise.all([
      getWaitlistAction(selectedDate),
      getReleasedSlotsAction(selectedDate),
      getPatientsAction(),
      getServicesAction(),
    ]);

    if (waitlistResult.success && waitlistResult.data) setWaitlist(waitlistResult.data);
    if (slotsResult.success && slotsResult.data) setReleasedSlots(slotsResult.data);
    if (patientsResult.success && patientsResult.data) setPatients(patientsResult.data);
    if (servicesResult.success && servicesResult.data) setServices(servicesResult.data);
    setIsLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleJoin = async () => {
    if (!joinPatientId || !joinDate) return;
    setIsJoining(true);
    setNotification(null);
    const result = await joinWaitlistAction(joinPatientId, joinDate);
    if (result.success) {
      setNotification({ type: "success", message: "Patient added to waitlist" });
      setJoinDialogOpen(false);
      await loadData();
    } else {
      setNotification({ type: "error", message: result.error ?? "Failed to join waitlist" });
    }
    setIsJoining(false);
  };

  const handleLeave = async (entryId: string) => {
    setPendingId(entryId);
    setNotification(null);
    const result = await leaveWaitlistAction(entryId);
    if (result.success) {
      setNotification({ type: "success", message: "Removed from waitlist" });
      await loadData();
    } else {
      setNotification({ type: "error", message: result.error ?? "Failed to remove" });
    }
    setPendingId(null);
  };

  const handleNotify = async (slot: ReleasedSlot) => {
    setPendingId(`notify-${slot.dentist_id}-${slot.time}`);
    setNotification(null);
    const result = await notifyNextAction(slot.dentist_id, slot.date, slot.time, slot.duration);
    if (result.success && result.data) {
      setNotification({
        type: "success",
        message: `Notified ${result.data.patient_name} about available slot at ${slot.time}`,
      });
      await loadData();
    } else if (result.success && !result.data) {
      setNotification({ type: "error", message: "No patients on the waitlist for this date" });
    } else {
      setNotification({ type: "error", message: result.error ?? "Failed to notify" });
    }
    setPendingId(null);
  };

  const handleOpenAccept = (entry: WaitlistEntryWithPatient, slot: ReleasedSlot) => {
    setAcceptEntry(entry);
    setAcceptSlot(slot);
    setAcceptServiceId("");
    setAcceptDialogOpen(true);
  };

  const handleAccept = async () => {
    if (!acceptEntry || !acceptSlot || !acceptServiceId) return;
    setIsAccepting(true);
    setNotification(null);
    const result = await acceptWaitlistSlotAction(
      acceptEntry.id,
      acceptSlot.dentist_id,
      acceptSlot.date,
      acceptSlot.time,
      acceptServiceId,
    );
    if (result.success && result.data) {
      setNotification({
        type: "success",
        message: `Appointment created: ${result.data.referenceNo}`,
      });
      setAcceptDialogOpen(false);
      await loadData();
    } else {
      setNotification({ type: "error", message: result.error ?? "Failed to accept slot" });
    }
    setIsAccepting(false);
  };

  const handleDecline = async (entryId: string) => {
    setPendingId(`decline-${entryId}`);
    setNotification(null);
    const result = await declineWaitlistAction(entryId);
    if (result.success) {
      setNotification({ type: "success", message: "Slot declined, notifying next patient" });
      await loadData();
    } else {
      setNotification({ type: "error", message: result.error ?? "Failed to decline" });
    }
    setPendingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Waitlist Management</h1>
          <p className="text-sm text-muted-foreground">Manage same-day waitlist and released slots</p>
        </div>
        <Button onClick={() => { setJoinPatientId(""); setJoinDate(selectedDate); setJoinDialogOpen(true); }}>
          <ListPlus className="mr-2 h-4 w-4" />
          Add to Waitlist
        </Button>
      </div>

      {notification && (
        <Alert variant={notification.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="dateFilter">Date</Label>
        <Input
          id="dateFilter"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Available Slots ({releasedSlots.length})
            </CardTitle>
            <CardDescription>Open slots from cancellations, no-shows, and early completions</CardDescription>
          </CardHeader>
          <CardContent>
            {releasedSlots.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No available slots for this date.</p>
            ) : (
              <div className="space-y-2">
                {releasedSlots.map((slot, idx) => (
                  <div
                    key={`${slot.dentist_id}-${slot.time}-${idx}`}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{slot.time}</Badge>
                        <span className="text-sm font-medium">{slot.dentist_name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{slot.duration} min slot</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleNotify(slot)}
                      disabled={pendingId === `notify-${slot.dentist_id}-${slot.time}` || waitlist.length === 0}
                    >
                      {pendingId === `notify-${slot.dentist_id}-${slot.time}` ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Bell className="mr-1 h-3 w-3" />
                      )}
                      Notify Next
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Waitlist Queue ({waitlist.length})
            </CardTitle>
            <CardDescription>FIFO order — first joined, first notified</CardDescription>
          </CardHeader>
          <CardContent>
            {waitlist.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No patients on the waitlist.</p>
            ) : (
              <div className="space-y-2">
                {waitlist.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium">{entry.patient_name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Joined {new Date(entry.joined_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {entry.notified_at && (
                            <Badge variant="outline" className="ml-1">Notified</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {entry.notified_at && releasedSlots.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAccept(entry, releasedSlots[0])}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Accept
                        </Button>
                      )}
                      {entry.notified_at && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDecline(entry.id)}
                          disabled={pendingId === `decline-${entry.id}`}
                        >
                          {pendingId === `decline-${entry.id}` ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <X className="mr-1 h-3 w-3" />
                          )}
                          Decline
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleLeave(entry.id)}
                        disabled={pendingId === entry.id}
                      >
                        {pendingId === entry.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Patient to Waitlist</DialogTitle>
            <DialogDescription>The patient will be notified when a slot becomes available.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={joinPatientId} onValueChange={(v) => v && setJoinPatientId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="joinDate">Requested Date</Label>
              <Input
                id="joinDate"
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleJoin} disabled={!joinPatientId || !joinDate || isJoining}>
              {isJoining ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : "Add to Waitlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Waitlist Slot</DialogTitle>
            <DialogDescription>
              {acceptEntry && acceptSlot &&
                `Assign ${acceptEntry.patient_name} to ${acceptSlot.dentist_name} at ${acceptSlot.time} on ${acceptSlot.date}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service</Label>
              <Select value={acceptServiceId} onValueChange={(v) => v && setAcceptServiceId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAccept} disabled={!acceptServiceId || isAccepting}>
              {isAccepting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Appointment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
