"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { todayLocal } from "@/lib/utils/date-utils";
import { checkInPatientAction } from "./actions";
import { Search, Loader2, CheckCircle2, Clock, User, QrCode, Activity, Users, Calendar, UserCheck, RefreshCw } from "lucide-react";

interface CheckInAppointment {
  id: string;
  reference_no: string;
  booking_status: string;
  visit_status: string | null;
  scheduled_time: string;
  total_duration: number;
  patient_name: string;
  patient_contact: string;
}

interface CheckInClientProps {
  initialAppointments: CheckInAppointment[];
}

export function CheckInClient({ initialAppointments }: CheckInClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CheckInAppointment[]>(initialAppointments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(initialAppointments);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const today = todayLocal();
      const res = await fetch(
        `/api/check-in/search?q=${encodeURIComponent(q)}&date=${today}`,
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Search failed");
        setResults([]);
      } else {
        setResults(data.appointments ?? []);
      }
    } catch {
      setError("Failed to search");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [initialAppointments]);

  useEffect(() => {
    handleSearch(debouncedQuery);
  }, [debouncedQuery, handleSearch]);

  const handleCheckIn = async (appointmentId: string, patientName: string) => {
    setPendingId(appointmentId);
    setError(null);
    setSuccess(null);

    try {
      const result = await checkInPatientAction(appointmentId);

      if (!result.success) {
        setError(result.error ?? "Check-in failed");
      } else {
        setSuccess(`${patientName} checked in successfully`);
        setResults((prev) => prev.filter((r) => r.id !== appointmentId));
        router.refresh();
      }
    } finally {
      setPendingId(null);
    }
  };

  const pendingArrivals = results.filter((a) => a.visit_status === null).length;
  const checkedInCount = results.filter((a) => a.visit_status === "checked_in").length;
  const inConsultationCount = results.filter((a) => a.visit_status === "in_consultation").length;

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/60 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Patient Check-In & Arrival Desk</h1>
              <Badge variant="outline" className="border-border text-foreground font-mono text-[10px]">
                {results.length} today
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Lookup patients, process arrivals, and track active queue status</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="h-9 rounded-xl border-border/60 text-xs hover:bg-muted/50 transition-all"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Refresh Desk
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500/20 bg-red-500/5 rounded-2xl">
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 rounded-2xl">
          <AlertDescription className="text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* STATS SUMMARY ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Total Scheduled</p>
            <p className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">{results.length}</p>
          </div>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Awaiting Arrival</p>
            <p className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">{pendingArrivals}</p>
          </div>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Checked In</p>
            <p className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">{checkedInCount}</p>
          </div>
          <CheckCircle2 className="h-4 w-4 text-cyan-600" />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">In Treatment</p>
            <p className="text-2xl font-extrabold text-foreground mt-1 tabular-nums">{inConsultationCount}</p>
          </div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Search Input */}
      <div className="space-y-1.5">
        <Label htmlFor="search" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Patient Search Lookup
        </Label>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by patient name, phone (+63...), or reference code..."
            className="pl-10 h-10 border-border/60 focus-visible:ring-cyan-500 rounded-xl text-xs"
            autoFocus
          />
          {isLoading && (
            <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-600" />
          )}
        </div>
      </div>

      {/* Patient Cards List */}
      {results.length > 0 && (
        <div className="space-y-3">
          {query.trim().length < 2 && (
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-cyan-600" /> Today's Scheduled Patients ({results.length})
              </h2>
              <span className="text-xs font-medium text-muted-foreground">
                {new Date().toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((appt) => (
              <Card key={appt.id} className="border-border/60 hover:border-cyan-500/40 transition-all rounded-2xl shadow-xs">
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-cyan-600" />
                      <span className="font-bold text-sm text-foreground">{appt.patient_name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">Ref: {appt.reference_no}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {appt.scheduled_time} ({appt.total_duration}m)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="secondary" className="text-[10px] uppercase font-semibold">{appt.booking_status}</Badge>
                      {appt.visit_status && (
                        <Badge variant="outline" className="text-[10px] border-border text-foreground font-semibold uppercase">
                          {appt.visit_status.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(appt.id, appt.patient_name)}
                      disabled={pendingId === appt.id || appt.visit_status === "checked_in" || appt.visit_status === "in_consultation"}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs h-9 shadow-xs"
                    >
                      {pendingId === appt.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {appt.visit_status === "checked_in"
                        ? "Checked In"
                        : appt.visit_status === "in_consultation"
                          ? "In Consultation"
                          : appt.visit_status === "checkout"
                            ? "Checked Out"
                            : appt.visit_status
                              ? appt.visit_status.replace(/_/g, " ")
                              : "Check In"}
                    </Button>
                    <Link href={`/check-in/qr/${appt.id}`}>
                      <Button variant="outline" size="sm" className="rounded-xl border-border/60 text-xs h-9 hover:bg-muted/50">
                        <QrCode className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                        QR
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !isLoading && (
        <div className="rounded-2xl border border-dashed border-border/80 py-16 text-center bg-card/40">
          <p className="text-sm font-semibold text-muted-foreground">No appointments scheduled for today</p>
        </div>
      )}
    </div>
  );
}
