"use client";

import { useEffect, useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar, Clock, User, FileText, CheckCircle2, Stethoscope, ArrowUpRight } from "lucide-react";
import { getPatientVisitHistoryAction, type PatientVisitItem } from "@/app/(dashboard)/patients/[id]/visit-actions";

interface PatientVisitHistoryProps {
  patientId: string;
}

const BOOKING_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "border-amber-500/30 text-amber-600 bg-amber-500/10" },
  approved: { label: "Approved", className: "border-blue-500/30 text-blue-600 bg-blue-500/10" },
  confirmed: { label: "Confirmed", className: "border-cyan-500/30 text-cyan-600 bg-cyan-500/10" },
  completed: { label: "Completed", className: "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" },
  cancelled: { label: "Cancelled", className: "border-red-500/30 text-red-600 bg-red-500/10" },
  rescheduled: { label: "Rescheduled", className: "border-violet-500/30 text-violet-600 bg-violet-500/10" },
};

const VISIT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  checked_in: { label: "Checked In", className: "border-cyan-500/30 text-cyan-600 bg-cyan-500/10" },
  waiting: { label: "Waiting", className: "border-amber-500/30 text-amber-600 bg-amber-500/10" },
  delayed: { label: "Delayed", className: "border-orange-500/30 text-orange-600 bg-orange-500/10" },
  in_consultation: { label: "In Consultation", className: "border-blue-500/30 text-blue-600 bg-blue-500/10" },
  treatment_ongoing: { label: "Treatment Ongoing", className: "border-blue-500/30 text-blue-600 bg-blue-500/10" },
  treatment_paused: { label: "Treatment Paused", className: "border-amber-500/30 text-amber-600 bg-amber-500/10" },
  checkout: { label: "Checkout", className: "border-violet-500/30 text-violet-600 bg-violet-500/10" },
  completed: { label: "Completed", className: "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export const PatientVisitHistory = memo(function PatientVisitHistory({
  patientId,
}: PatientVisitHistoryProps) {
  const [items, setItems] = useState<PatientVisitItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPatientVisitHistoryAction(patientId).then((res) => {
      if (res.success && res.data) {
        setItems(res.data);
      } else {
        setError(res.error ?? "Failed to load visit history");
      }
      setIsLoading(false);
    });
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
        <CardContent className="p-8 text-center">
          <Calendar className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-bold text-foreground">No Visit History</p>
          <p className="text-xs text-muted-foreground mt-1">
            Past and upcoming appointment records will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const upcoming = items.filter((item) => new Date(item.scheduledDate) >= now && item.bookingStatus !== "cancelled");
  const past = items.filter((item) => new Date(item.scheduledDate) < now || item.bookingStatus === "completed");

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-muted-foreground">Upcoming Appointments</p>
          {upcoming.map((item) => (
            <VisitCard key={item.appointmentId} item={item} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-muted-foreground">Past Visits</p>
          {past.map((item) => (
            <VisitCard key={item.appointmentId} item={item} />
          ))}
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
          <CardContent className="p-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-bold text-foreground">No Visit History</p>
            <p className="text-xs text-muted-foreground mt-1">
              Past and upcoming appointment records will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

function VisitCard({ item }: { item: PatientVisitItem }) {
  const bookingCfg = BOOKING_STATUS_CONFIG[item.bookingStatus] ?? {
    label: item.bookingStatus.replace(/_/g, " "),
    className: "border-border text-muted-foreground",
  };
  const visitCfg = item.visitStatus
    ? VISIT_STATUS_CONFIG[item.visitStatus] ?? {
        label: item.visitStatus.replace(/_/g, " "),
        className: "border-border text-muted-foreground",
      }
    : null;

  return (
    <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
      <CardHeader className="border-b border-border/40 pb-3 flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-cyan-600" />
          {item.referenceNo}
        </CardTitle>
        <div className="flex items-center gap-1.5">
          {visitCfg && (
            <Badge variant="outline" className={`text-[10px] font-bold ${visitCfg.className}`}>
              {visitCfg.label}
            </Badge>
          )}
          <Badge variant="outline" className={`text-[10px] font-bold ${bookingCfg.className}`}>
            {bookingCfg.label}
          </Badge>
          <a
            href={`/billing/${item.appointmentId}`}
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-cyan-600 hover:text-cyan-700 transition-colors"
          >
            View <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Appointment Info */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className="flex items-center gap-1 text-foreground font-medium">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {formatDate(item.scheduledDate)}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground font-mono">
            <Clock className="h-3 w-3" />
            {item.scheduledTime}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3 w-3" />
            {item.dentistName}
          </span>
          <span className="text-muted-foreground">· {formatDuration(item.totalDuration)}</span>
        </div>

        {/* Services */}
        {item.services.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Stethoscope className="h-3 w-3 text-muted-foreground" />
            {item.services.map((svc, idx) => (
              <Badge key={idx} variant="secondary" className="text-[10px]">
                {svc.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Treatment Record Summary */}
        {item.treatmentRecord && (
          <div className="rounded-lg bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-cyan-600" />
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Treatment Record</span>
            </div>
            {item.treatmentRecord.diagnosis && (
              <p className="text-xs text-foreground">
                <span className="font-semibold">Diagnosis:</span> {item.treatmentRecord.diagnosis}
              </p>
            )}
            {item.treatmentRecord.procedures && (
              <p className="text-xs text-foreground">
                <span className="font-semibold">Procedures:</span> {item.treatmentRecord.procedures}
              </p>
            )}
            {item.treatmentRecord.clinicalNotes && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                <span className="font-semibold text-foreground">Notes:</span> {item.treatmentRecord.clinicalNotes}
              </p>
            )}
          </div>
        )}

        {/* Consent Status */}
        <div className="flex items-center gap-1.5 text-[10px]">
          {item.consentSigned ? (
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="h-3 w-3" /> Consent Signed
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground">
              <FileText className="h-3 w-3" /> Consent Not Signed
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
