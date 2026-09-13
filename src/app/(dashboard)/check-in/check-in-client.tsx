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
import { UserCheck, RefreshCw, CheckCircle2, Users, Clock, Activity, Search, Loader2, Calendar, User, QrCode } from "lucide-react";
import { PageHeroBanner } from "@/components/shared/page-hero-banner";

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
    <div className="space-y-6 pb-8">
      {/* LIGHT SaaS HERO HEADER */}
      <PageHeroBanner
        icon={UserCheck}
        title="Patient Check-In & Arrival Desk"
        description="Lookup patient records, process clinic arrivals, and track active queue status"
        badgeText={`${results.length} Scheduled Today`}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.refresh()}
          className="h-9 rounded-xl border-border/80 text-xs font-semibold"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-cyan-600" /> Refresh Desk
        </Button>
      </PageHeroBanner>

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
        <div className="stat-card-glow flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Scheduled</p>
            <p className="text-3xl font-black text-foreground mt-2 tabular-nums">{results.length}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600">
            <Users className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="stat-card-glow flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Awaiting Arrival</p>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2 tabular-nums">{pendingArrivals}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <Clock className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="stat-card-glow flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Checked In</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums">{checkedInCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
        </div>

        <div className="stat-card-glow flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">In Treatment</p>
            <p className="text-3xl font-black text-teal-600 dark:text-teal-400 mt-2 tabular-nums">{inConsultationCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600">
            <Activity className="h-4.5 w-4.5" />
          </div>
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
                      disabled={pendingId === appt.id || ["checked_in", "in_consultation", "completed", "checkout"].includes(appt.visit_status ?? "")}
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
