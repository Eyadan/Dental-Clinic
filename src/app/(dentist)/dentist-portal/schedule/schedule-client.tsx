"use client";

import { useState, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Phone, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScheduleItem {
  id: string;
  reference_no: string;
  scheduled_time: string;
  total_duration: number;
  booking_status: string;
  visit_status: string | null;
  patient_name: string;
  patient_contact: string;
  services: string[];
}

interface DentistScheduleClientProps {
  items: ScheduleItem[];
}

const BOOKING_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  confirmed: { label: "Confirmed", variant: "default" },
  reschedule_required: { label: "Reschedule Required", variant: "secondary" },
  rescheduled: { label: "Rescheduled", variant: "default" },
};

const VISIT_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  checked_in: { label: "Checked In", variant: "default" },
  waiting: { label: "Waiting", variant: "secondary" },
  delayed: { label: "Delayed", variant: "destructive" },
  in_consultation: { label: "In Consultation", variant: "default" },
  treatment_ongoing: { label: "Treatment Ongoing", variant: "default" },
  treatment_paused: { label: "Treatment Paused", variant: "secondary" },
};

export const DentistScheduleClient = memo(function DentistScheduleClient({ items }: DentistScheduleClientProps) {
  const [selectedPatient, setSelectedPatient] = useState<ScheduleItem | null>(null);

  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Today's Schedule</h1>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <CalendarDays className="mb-2 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No appointments scheduled for today</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const bookingBadge = BOOKING_BADGES[item.booking_status] ?? {
              label: item.booking_status,
              variant: "outline" as const,
            };
            const visitBadge = item.visit_status
              ? VISIT_BADGES[item.visit_status] ?? { label: item.visit_status, variant: "outline" as const }
              : null;

            return (
              <Card
                key={item.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedPatient(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{item.scheduled_time}</span>
                        <span className="text-xs text-muted-foreground">{item.total_duration} min</span>
                      </div>
                      <p className="font-medium">{item.patient_name}</p>
                      {item.services.length > 0 && (
                        <p className="text-xs text-muted-foreground">{item.services.join(", ")}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Badge variant={bookingBadge.variant}>{bookingBadge.label}</Badge>
                      {visitBadge && <Badge variant={visitBadge.variant}>{visitBadge.label}</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Patient Quick View</DialogTitle>
            <DialogDescription>
              {selectedPatient && `Ref: ${selectedPatient.reference_no}`}
            </DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Patient</p>
                <p className="font-semibold">{selectedPatient.patient_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contact</p>
                <a
                  href={`tel:${selectedPatient.patient_contact}`}
                  className="flex items-center gap-2 font-semibold text-primary"
                >
                  <Phone className="h-4 w-4" />
                  {selectedPatient.patient_contact}
                </a>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time</p>
                <p className="font-semibold">{selectedPatient.scheduled_time} ({selectedPatient.total_duration} min)</p>
              </div>
              {selectedPatient.services.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Services</p>
                  <ul className="list-inside list-disc text-sm">
                    {selectedPatient.services.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2">
                <Badge variant={BOOKING_BADGES[selectedPatient.booking_status]?.variant ?? "outline"}>
                  {BOOKING_BADGES[selectedPatient.booking_status]?.label ?? selectedPatient.booking_status}
                </Badge>
                {selectedPatient.visit_status && (
                  <Badge variant={VISIT_BADGES[selectedPatient.visit_status]?.variant ?? "outline"}>
                    {VISIT_BADGES[selectedPatient.visit_status]?.label ?? selectedPatient.visit_status}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});
