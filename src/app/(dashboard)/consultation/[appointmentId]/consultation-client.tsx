"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseAllergies } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { startConsultationAction } from "./actions";
import { ConsentFormGenerator } from "./consent-form-generator";
import { TreatmentForm } from "./treatment-form";
import { RxHistoryViewer } from "./rx-history-viewer";
import { RxGeneratorDialog } from "./rx-generator-dialog";
import { Loader2, Stethoscope, Phone, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import { PageHeroBanner } from "@/components/shared/page-hero-banner";
import type { ConsentClause, DentalChart, ToothPresence, ToothFinding } from "@/lib/types/database";

interface ConsultationClientProps {
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientContact: string;
  patientBirthDate: string | null;
  patientMedicalHistory: string | null;
  patientAllergies: string | null;
  visitStatus: string;
  scheduledTime: string;
  dentistName: string;
  services: string[];
  hasConsent: boolean;
  isConsentSigned?: boolean;
  consentClauses: ConsentClause[];
  dentalChart: DentalChart;
  dentalChartPresence: ToothPresence[];
  dentalChartFindings: ToothFinding[];
}

export function ConsultationClient({
  appointmentId,
  patientId,
  patientName,
  patientContact,
  patientBirthDate,
  patientMedicalHistory,
  patientAllergies,
  visitStatus,
  scheduledTime,
  dentistName,
  services,
  hasConsent,
  isConsentSigned = false,
  consentClauses,
  dentalChart,
  dentalChartPresence,
  dentalChartFindings,
}: ConsultationClientProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentVisitStatus, setCurrentVisitStatus] = useState(visitStatus);
  const [isConsentGenerated, setIsConsentGenerated] = useState(hasConsent);
  const [isRxDialogOpen, setIsRxDialogOpen] = useState(false);
  const [rxRefreshKey, setRxRefreshKey] = useState(0);

  const handleStartConsultation = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const result = await startConsultationAction(appointmentId);
      if (result.success) {
        setCurrentVisitStatus("in_consultation");
        setSuccess("Consultation started");
        router.refresh();
      } else {
        setError(result.error ?? "Failed to start consultation");
      }
    } finally {
      setIsStarting(false);
    }
  };

  const canStartConsultation = ["waiting", "checked_in"].includes(currentVisitStatus);

  return (
    <div className="space-y-6">
      {/* LIGHT SaaS HERO HEADER */}
      <PageHeroBanner
        icon={Stethoscope}
        title="Clinical Consultation Workspace"
        description={`Patient: ${patientName} · Time: ${scheduledTime} · Dentist: ${dentistName}`}
        badgeText={currentVisitStatus.replace(/_/g, " ")}
      >
        {canStartConsultation && (
          <Button onClick={handleStartConsultation} disabled={isStarting} size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs">
            {isStarting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Stethoscope className="mr-1.5 h-3.5 w-3.5" />}
            Start Clinical Consultation
          </Button>
        )}
      </PageHeroBanner>

      {error && (
        <Alert variant="destructive" className="rounded-2xl border-rose-500/30 bg-rose-500/10 text-rose-300">
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="rounded-2xl border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
          <AlertDescription className="text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* PATIENT VITAL INFO CARD */}
      <Card className="card-premium p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Contact Number</p>
            <p className="font-semibold text-foreground font-mono flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-cyan-500" /> {patientContact}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Requested Procedures</p>
            <div className="flex flex-wrap gap-1">
              {services.map((s, idx) => (
                <Badge key={idx} variant="outline" className="border-border/60 bg-muted/30 text-foreground text-[10px]">{s}</Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Allergy Alerts</p>
            {(() => {
              const allergyList = parseAllergies(patientAllergies);
              return allergyList.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1">
                  {allergyList.map((allergy, idx) => (
                    <Badge key={idx} variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-300 bg-amber-500/15 text-[10px] font-bold">
                      <AlertTriangle className="mr-1 h-3 w-3 shrink-0 text-amber-500" /> {allergy}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-300 bg-emerald-500/15 text-[10px] font-semibold">
                  <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-500 shrink-0" /> No Known Allergies
                </Badge>
              );
            })()}
          </div>
        </div>
      </Card>

      {/* ISSUED PRESCRIPTIONS HISTORY VIEWER */}
      <RxHistoryViewer
        appointmentId={appointmentId}
        patientId={patientId}
        patientName={patientName}
        dentistName={dentistName}
        onOpenCreateDialog={() => setIsRxDialogOpen(true)}
        refreshKey={rxRefreshKey}
      />

      {/* CONSENT FORM GENERATOR */}
      <ConsentFormGenerator
        appointmentId={appointmentId}
        visitStatus={currentVisitStatus}
        consentClauses={consentClauses}
        hasConsent={isConsentGenerated}
        onGenerated={() => {
          setIsConsentGenerated(true);
          setSuccess("Consent form generated — patient can now sign on tablet");
          router.refresh();
        }}
        onError={setError}
      />

      {/* TREATMENT FORM & CLINICAL LOG */}
      <TreatmentForm
        appointmentId={appointmentId}
        patientId={patientId}
        visitStatus={currentVisitStatus}
        hasConsent={isConsentGenerated}
        isConsentSigned={isConsentSigned}
        dentalChart={dentalChart}
        dentalChartPresence={dentalChartPresence}
        dentalChartFindings={dentalChartFindings}
      />

      {/* RX GENERATOR DIALOG MODAL */}
      <RxGeneratorDialog
        open={isRxDialogOpen}
        onOpenChange={setIsRxDialogOpen}
        appointmentId={appointmentId}
        patientId={patientId}
        patientName={patientName}
        dentistName={dentistName}
        onPrescriptionCreated={() => {
          setSuccess("Prescription recorded successfully.");
          setRxRefreshKey((prev) => prev + 1);
          router.refresh();
        }}
      />
    </div>
  );
}
