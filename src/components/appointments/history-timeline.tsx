"use client";

import { useEffect, useState, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, History, ArrowRight } from "lucide-react";
import { getAppointmentHistoryAction, type HistoryEntry } from "@/app/(dashboard)/appointments/[id]/history/actions";

interface HistoryTimelineProps {
  appointmentId: string;
}

const FIELD_LABELS: Record<string, string> = {
  booking_status: "Booking Status",
  visit_status: "Visit Status",
  scheduled_date: "Scheduled Date",
  scheduled_time: "Scheduled Time",
  dentist_id: "Dentist",
  patient_id: "Patient",
  total_duration: "Total Duration",
  total_cost: "Total Cost",
  is_archived: "Archived",
};

export const HistoryTimeline = memo(function HistoryTimeline({ appointmentId }: HistoryTimelineProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAppointmentHistoryAction(appointmentId).then((res) => {
      if (res.success && res.data) {
        setEntries(res.data);
      } else {
        setError(res.error ?? "Failed to load history");
      }
      setIsLoading(false);
    });
  }, [appointmentId]);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
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

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <History className="mb-2 h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No changes recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const fieldLabel = FIELD_LABELS[entry.field_name] ?? entry.field_name.replace(/_/g, " ");
        const isLast = index === entries.length - 1;

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border" />}
            </div>

            <Card className="flex-1">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{fieldLabel}</Badge>
                    <span className="text-xs text-muted-foreground">
                      by {entry.changed_by}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.changed_at).toLocaleString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2 text-sm">
                  {entry.old_value ? (
                    <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground line-through">
                      {entry.old_value}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  {entry.new_value ? (
                    <span className="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary">
                      {entry.new_value}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
});
