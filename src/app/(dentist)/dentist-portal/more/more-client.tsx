"use client";

import { useState } from "react";
import Link from "next/link";
import { parseAllergies } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Phone, Mail, Calendar, AlertCircle, FileText, LogOut, Siren, Clock } from "lucide-react";

interface PatientQuickView {
  id: string;
  reference_no: string;
  scheduled_time: string;
  booking_status: string;
  visit_status: string | null;
  patient_name: string;
  patient_contact: string;
  patient_email: string | null;
  patient_birth_date: string | null;
  patient_medical_history: string | null;
  patient_allergies: string | null;
}

interface MorePageClientProps {
  dentistName: string;
  dentistEmail: string;
  specialization: string | null;
  patients: PatientQuickView[];
}

export function MorePageClient({
  dentistName,
  dentistEmail,
  specialization,
  patients,
}: MorePageClientProps) {
  const [selectedPatient, setSelectedPatient] = useState<PatientQuickView | null>(null);

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold">More</h1>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{dentistName}</p>
              <p className="text-sm text-muted-foreground">{dentistEmail}</p>
              {specialization && (
                <p className="text-xs text-muted-foreground">{specialization}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Today's Patients
        </h2>
        {patients.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No patients today</p>
        ) : (
          <div className="space-y-2">
            {patients.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedPatient(p)}
              >
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium">{p.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{p.scheduled_time} · Ref: {p.reference_no}</p>
                  </div>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Quick Actions
        </h2>
        <Link href="/dentist-portal/emergency" className="block">
          <Button variant="destructive" className="w-full" style={{ minHeight: "44px" }}>
            <Siren className="mr-2 h-4 w-4" />
            Declare Emergency
          </Button>
        </Link>
        <Link href="/dentist-portal/availability" className="block">
          <Button variant="outline" className="w-full" style={{ minHeight: "44px" }}>
            <Clock className="mr-2 h-4 w-4" />
            My Availability
          </Button>
        </Link>
        <Link href="/dentist-portal/schedule" className="block">
          <Button variant="outline" className="w-full" style={{ minHeight: "44px" }}>
            <Calendar className="mr-2 h-4 w-4" />
            View Schedule
          </Button>
        </Link>
        <Link href="/dentist-portal/queue" className="block">
          <Button variant="outline" className="w-full" style={{ minHeight: "44px" }}>
            <FileText className="mr-2 h-4 w-4" />
            View Queue
          </Button>
        </Link>
      </div>

      <div className="pt-4">
        <Link href="/login" className="block">
          <Button variant="ghost" className="w-full" style={{ minHeight: "44px" }}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </Link>
      </div>

      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Patient Quick View</DialogTitle>
            <DialogDescription>
              {selectedPatient && `Ref: ${selectedPatient.reference_no} · ${selectedPatient.scheduled_time}`}
            </DialogDescription>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Patient Name</p>
                <p className="font-semibold">{selectedPatient.patient_name}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact</p>
                  <a
                    href={`tel:${selectedPatient.patient_contact}`}
                    className="flex items-center gap-1 text-sm font-medium text-primary"
                  >
                    <Phone className="h-3 w-3" />
                    {selectedPatient.patient_contact}
                  </a>
                </div>
                {selectedPatient.patient_email && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      {selectedPatient.patient_email}
                    </div>
                  </div>
                )}
                {selectedPatient.patient_birth_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Birth Date</p>
                    <p className="text-sm">{selectedPatient.patient_birth_date}</p>
                  </div>
                )}
              </div>

              {(() => {
                const allergyList = parseAllergies(selectedPatient.patient_allergies);
                return allergyList.length > 0 ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-600">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <p className="text-sm font-semibold">Known Allergies ({allergyList.length})</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {allergyList.map((allergy, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <AlertCircle className="h-3 w-3 shrink-0 text-amber-600" /> {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {selectedPatient.patient_medical_history && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Medical History</p>
                  <p className="text-sm">{selectedPatient.patient_medical_history}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Badge variant="outline">{selectedPatient.booking_status}</Badge>
                {selectedPatient.visit_status && (
                  <Badge variant="default">{selectedPatient.visit_status}</Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
