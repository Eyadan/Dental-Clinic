"use client";

import { useState, useEffect, useCallback } from "react";
import { ListPlus, Clock, Check, X, Bell, Loader2, CalendarDays, User, Sparkles } from "lucide-react";
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

  const handleNotifyNext = async (slot: ReleasedSlot) => {
    setPendingId(`notify-${slot.dentist_id}-${slot.time}`);
    setNotification(null);
    const result = await notifyNextAction(slot.dentist_id, selectedDate, slot.time, slot.duration);
    if (result.success && result.data) {
      setNotification({
        type: "success",
        message: `Notified ${result.data.patient_name}. They have 15 minutes to accept.`,
      });
      await loadData();
    } else {
      setNotification({ type: "error", message: result.error ?? "No waiting patient to notify" });
    }
    setPendingId(null);
  };

  const handleOpenAccept = (entry: WaitlistEntryWithPatient, slot: ReleasedSlot) => {
    setAcceptEntry(entry);
    setAcceptSlot(slot);
    setAcceptServiceId(services[0]?.id ?? "");
    setAcceptDialogOpen(true);
  };

  const handleConfirmAccept = async () => {
    if (!acceptEntry || !acceptSlot || !acceptServiceId) return;
    setIsAccepting(true);
    setNotification(null);
    const result = await acceptWaitlistSlotAction(
      acceptEntry.id,
      acceptSlot.dentist_id,
      selectedDate,
      acceptSlot.time,
      acceptServiceId,
    );
    if (result.success) {
      setNotification({ type: "success", message: "Appointment created from waitlist!" });
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
            <ListPlus className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Waitlist Management Desk</h1>
              <Badge variant="outline" className="border-border text-foreground font-mono text-[10px]">
                {waitlist.length} waiting
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Manage same-day waitlist requests, released appointment slots, and patient auto-notifications</p>
          </div>
        </div>

        <Button onClick={() => { setJoinPatientId(""); setJoinDate(selectedDate); setJoinDialogOpen(true); }} size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs">
          <ListPlus className="mr-1.5 h-3.5 w-3.5" />
          Add Patient to Waitlist
        </Button>
      </div>

      {notification && (
        <Alert variant={notification.type === "error" ? "destructive" : "default"} className="rounded-2xl border-border/80">
          <AlertDescription className="text-xs font-semibold">{notification.message}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="dateFilter" className="text-xs font-semibold text-muted-foreground">Filter by Date</Label>
        <Input
          id="dateFilter"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="h-10 text-xs border-border/80 rounded-xl"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* RELEASED SLOTS */}
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-cyan-600" />
              Available Slots ({releasedSlots.length})
            </CardTitle>
            <CardDescription className="text-xs">Open slots from cancellations, no-shows, and early completions.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {releasedSlots.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground italic">No available slots released for this date.</p>
            ) : (
              releasedSlots.map((slot, idx) => (
                <div key={`${slot.dentist_id}-${slot.time}-${idx}`} className="flex items-center justify-between rounded-xl border border-border/60 p-3 bg-muted/20 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 font-mono text-[10px]">{slot.time}</Badge>
                      <span className="font-semibold text-foreground">{slot.dentist_name}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleNotifyNext(slot)}
                    disabled={pendingId === `notify-${slot.dentist_id}-${slot.time}`}
                    className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    {pendingId === `notify-${slot.dentist_id}-${slot.time}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="mr-1.5 h-3.5 w-3.5" />}
                    Notify Next
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* WAITLIST QUEUE */}
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-600" />
              Waiting Patients ({waitlist.length})
            </CardTitle>
            <CardDescription className="text-xs">Ordered by request submission time.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {waitlist.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground italic">No patients currently on the waitlist for this date.</p>
            ) : (
              waitlist.map((entry, idx) => {
                const isNotified = !!entry.notified_at;
                return (
                  <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/60 p-3 bg-muted/20 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">#{idx + 1} — {entry.patient_name}</span>
                        <Badge variant="outline" className={`text-[10px] uppercase font-mono ${isNotified ? "border-amber-500/30 text-amber-600 bg-amber-500/10" : ""}`}>
                          {isNotified ? "Notified" : "Waiting"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">{entry.patient_contact}</p>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {isNotified && releasedSlots[0] && (
                        <>
                          <Button size="sm" onClick={() => handleOpenAccept(entry, releasedSlots[0])} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs">
                            <Check className="mr-1 h-3.5 w-3.5" /> Book
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDecline(entry.id)} className="h-8 border-border/80 text-destructive rounded-xl text-xs">
                            <X className="mr-1 h-3.5 w-3.5" /> Decline
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleLeave(entry.id)} className="h-8 text-xs text-muted-foreground hover:text-destructive">
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* JOIN WAITLIST DIALOG */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/80">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Patient to Waitlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Select Patient</Label>
              <Select value={joinPatientId} onValueChange={(v) => setJoinPatientId(v ?? "")}>
                <SelectTrigger className="h-10 text-xs border-border/80 rounded-xl">
                  <SelectValue placeholder="Choose patient..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Desired Date</Label>
              <Input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className="h-10 text-xs border-border/80 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setJoinDialogOpen(false)} className="rounded-xl text-xs">Cancel</Button>
            <Button size="sm" onClick={handleJoin} disabled={!joinPatientId || !joinDate || isJoining} className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs">
              {isJoining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add to Waitlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
