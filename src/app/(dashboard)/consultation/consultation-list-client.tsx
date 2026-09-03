"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, FileCheck, FileX } from "lucide-react";

export interface ConsultationListItem {
  appointmentId: string;
  referenceNo: string;
  patientName: string;
  scheduledTime: string;
  visitStatus: string | null;
  hasConsent: boolean;
}

interface ConsultationListClientProps {
  items: ConsultationListItem[];
}

const VISIT_STATUS_LABELS: Record<string, string> = {
  checked_in: "Checked In",
  waiting: "Waiting",
  in_consultation: "In Consultation",
  treatment_ongoing: "Treatment Ongoing",
  treatment_paused: "Treatment Paused",
  consent_signed: "Consent Signed",
};

const VISIT_STATUS_STYLES: Record<string, string> = {
  checked_in: "bg-blue-100 text-blue-800",
  waiting: "bg-blue-100 text-blue-800",
  in_consultation: "bg-purple-100 text-purple-800",
  treatment_ongoing: "bg-orange-100 text-orange-800",
  treatment_paused: "bg-yellow-100 text-yellow-800",
  consent_signed: "bg-teal-100 text-teal-800",
};

const MOCK_CONSULTATIONS: ConsultationListItem[] = [
  {
    appointmentId: "demo-appt-1",
    referenceNo: "REF-20260903-01",
    patientName: "Ana Patricia Lim",
    scheduledTime: "10:30 AM",
    visitStatus: "in_consultation",
    hasConsent: true,
  },
  {
    appointmentId: "demo-appt-2",
    referenceNo: "REF-20260903-02",
    patientName: "Pedro Reyes",
    scheduledTime: "11:15 AM",
    visitStatus: "checked_in",
    hasConsent: false,
  },
  {
    appointmentId: "demo-appt-3",
    referenceNo: "REF-20260903-03",
    patientName: "Maria Clara Santos",
    scheduledTime: "02:00 PM",
    visitStatus: "consent_signed",
    hasConsent: true,
  },
];

export function ConsultationListClient({ items }: ConsultationListClientProps) {
  const effectiveItems = items.length > 0 ? items : MOCK_CONSULTATIONS;

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Clinical Consultation Desk</h1>
              <Badge variant="outline" className="border-border text-foreground font-mono text-[10px]">
                {effectiveItems.length} active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Select a patient to start or continue treatment session</p>
          </div>
        </div>
      </div>

      {effectiveItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Stethoscope className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No patients waiting for consultation today.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {effectiveItems.map((item) => (
            <Link key={item.appointmentId} href={`/consultation/${item.appointmentId}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Stethoscope className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{item.patientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.referenceNo} · {item.scheduledTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.hasConsent ? (
                      <FileCheck className="h-4 w-4 text-green-600" />
                    ) : (
                      <FileX className="h-4 w-4 text-muted-foreground" />
                    )}
                    {item.visitStatus && (
                      <Badge
                        variant="secondary"
                        className={VISIT_STATUS_STYLES[item.visitStatus] ?? ""}
                      >
                        {VISIT_STATUS_LABELS[item.visitStatus] ?? item.visitStatus}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
