"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { checkInPatientAction } from "./actions";
import { Search, Loader2, CheckCircle2, Clock, User, QrCode } from "lucide-react";
import Link from "next/link";

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
      const today = new Date().toISOString().split("T")[0];
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Patient Check-In</h1>
        <p className="text-muted-foreground">
          Search by patient name, phone, or reference number
        </p>
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

      <div className="space-y-2">
        <Label htmlFor="search">Search Patient</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, phone, or reference number..."
            className="pl-10"
            autoFocus
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {query.trim().length < 2 && (
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">
                Today's Appointments ({results.length})
              </h2>
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
              </span>
            </div>
          )}
          {results.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{appt.patient_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>Ref: {appt.reference_no}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {appt.scheduled_time} · {appt.total_duration} min
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{appt.booking_status}</Badge>
                    {appt.visit_status && (
                      <Badge variant="outline">{appt.visit_status.replace(/_/g, " ")}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleCheckIn(appt.id, appt.patient_name)}
                    disabled={pendingId === appt.id || appt.visit_status !== null}
                  >
                    {pendingId === appt.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
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
                    <Button variant="outline" size="sm">
                      <QrCode className="mr-2 h-4 w-4" />
                      QR
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results.length === 0 && !isLoading && (
        <div className="rounded-lg border border-dashed py-16 text-center">
          {query.trim().length >= 2 ? (
            <>
              <p className="text-muted-foreground">No appointments found matching "{query}"</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try searching by name, phone number, or reference number.
              </p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">No appointments scheduled for today</p>
              <p className="text-sm text-muted-foreground mt-1">
                Approved or confirmed appointments for today will appear here automatically.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
