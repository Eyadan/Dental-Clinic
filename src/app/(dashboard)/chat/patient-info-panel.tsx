"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Phone, Mail, User } from "lucide-react";
import type { Appointment } from "@/lib/types/database";
import type { ConversationWithDetails } from "./actions";
import { getPatientAppointmentsAction } from "./actions";

interface PatientInfoPanelProps {
  conversation: ConversationWithDetails;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  approved: "bg-success/20 text-success",
  confirmed: "bg-success/20 text-success",
  declined: "bg-danger/20 text-danger",
  cancelled: "bg-danger/20 text-danger",
  expired: "bg-muted text-muted-foreground",
  completed: "bg-teal/20 text-teal",
  reschedule_required: "bg-info/20 text-info",
  pending_cancellation: "bg-warning/20 text-warning",
};

export function PatientInfoPanel({ conversation }: PatientInfoPanelProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!conversation.patient_id) {
      setAppointments([]);
      setIsLoading(false);
      return;
    }

    const loadAppointments = async () => {
      const result = await getPatientAppointmentsAction(conversation.patient_id!);
      if (result.success && result.data) {
        setAppointments(result.data);
      }
      setIsLoading(false);
    };

    loadAppointments();
  }, [conversation.patient_id]);

  if (!conversation.patient_id) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <User className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">Unknown Patient</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          This PSID is not linked to a patient record. Ask the patient to register at the clinic.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b p-4">
        <h3 className="text-sm font-semibold">Patient Information</h3>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="text-sm font-medium">{conversation.patient_name}</p>
          <p className="mt-1 text-xs text-text-subtle">PSID: {conversation.patient_psid}</p>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-medium uppercase text-text-subtle">
            Recent Appointments
          </h4>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No appointment history</p>
          ) : (
            <div className="space-y-2">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="rounded-md border border-border p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-text-subtle" />
                      <span className="text-xs font-medium">
                        {formatDate(apt.scheduled_date)}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[apt.booking_status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {apt.booking_status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {apt.scheduled_time} · {apt.total_duration}min
                  </p>
                  <p className="mt-0.5 text-xs text-text-subtle">
                    Ref: {apt.reference_no}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
