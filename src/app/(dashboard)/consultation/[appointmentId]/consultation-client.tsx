"use client";

import { useState } from "react";
import { parseAllergies } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { startConsultationAction, generateConsentAction } from "./actions";
import { TreatmentForm } from "./treatment-form";
import { Loader2, Stethoscope, FileCheck, User, Phone, Calendar, AlertTriangle, CheckCircle2, Sparkles, Activity } from "lucide-react";

interface ConsultationClientProps {
  appointmentId: string;
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
}

export function ConsultationClient({
  appointmentId,
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
}: ConsultationClientProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isGeneratingConsent, setIsGeneratingConsent] = useState(false);
  const [treatmentInfo, setTreatmentInfo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentVisitStatus, setCurrentVisitStatus] = useState(visitStatus);
  const [consentCreated, setConsentCreated] = useState(hasConsent);

  const handleStartConsultation = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const result = await startConsultationAction(appointmentId);
      if (result.success) {
        setCurrentVisitStatus("in_consultation");
        setSuccess("Consultation started");
      } else {
        setError(result.error ?? "Failed to start consultation");
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleGenerateConsent = async () => {
    if (!treatmentInfo.trim()) {
      setError("Treatment info is required to generate consent form");
      return;
    }

    setIsGeneratingConsent(true);
    setError(null);

    try {
      const result = await generateConsentAction(appointmentId, treatmentInfo);
      if (result.success) {
        setConsentCreated(true);
        setSuccess("Consent form generated — patient can sign on tablet");
      } else {
        setError(result.error ?? "Failed to generate consent");
      }
    } finally {
      setIsGeneratingConsent(false);
    }
  };

  const canStartConsultation = ["waiting", "checked_in"].includes(currentVisitStatus);
  const hasAllergies = patientAllergies && patientAllergies.trim().toLowerCase() !== "none" && patientAllergies.trim().toLowerCase() !== "";

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
              <h1 className="text-xl font-bold tracking-tight text-foreground">Clinical Consultation Workspace</h1>
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 font-mono text-[10px] uppercase">
                {currentVisitStatus.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">Patient: {patientName} · Time: {scheduledTime} · Dentist: {dentistName}</p>
          </div>
        </div>

        {canStartConsultation && (
          <Button onClick={handleStartConsultation} disabled={isStarting} size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs">
            {isStarting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Activity className="mr-1.5 h-3.5 w-3.5" />}
            Start Patient Treatment Session
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl border-red-500/20 bg-red-500/5">
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="rounded-2xl border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <AlertDescription className="text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* PATIENT VITAL INFO CARD */}
      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Contact Number</p>
            <p className="font-semibold text-foreground font-mono flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-cyan-600" /> {patientContact}</p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Requested Procedures</p>
            <div className="flex flex-wrap gap-1">
              {services.map((s, idx) => (
                <Badge key={idx} variant="outline" className="border-border text-foreground text-[10px]">{s}</Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Allergy Alerts</p>
            {(() => {
              const allergyList = parseAllergies(patientAllergies);
              return allergyList.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1">
                  {allergyList.map((allergy, idx) => (
                    <Badge key={idx} variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-[10px] font-bold">
                      <AlertTriangle className="mr-1 h-3 w-3 shrink-0" /> {allergy}
                    </Badge>
                  ))}
                </div>
              ) : (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] font-semibold">
                  <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600 shrink-0" /> No Known Allergies
                </Badge>
              );
            })()}
          </div>
        </div>
      </Card>

      {/* CONSENT FORM GENERATOR */}
      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
        <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-cyan-600" /> Informed Consent Form
          </CardTitle>
          {consentCreated && (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] font-bold">
              Consent Form Generated
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs">
          {!consentCreated ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="treatmentInfo" className="text-xs font-semibold text-muted-foreground">Procedure Treatment Details for Consent *</Label>
                <Textarea
                  id="treatmentInfo"
                  placeholder="Describe treatment plan, potential risks, and post-op care instructions for patient consent..."
                  value={treatmentInfo}
                  onChange={(e) => setTreatmentInfo(e.target.value)}
                  rows={3}
                  className="text-xs border-border/80 rounded-xl"
                />
              </div>
              <Button
                size="sm"
                onClick={handleGenerateConsent}
                disabled={isGeneratingConsent || !treatmentInfo.trim()}
                className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {isGeneratingConsent ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileCheck className="mr-1.5 h-3.5 w-3.5" />}
                Generate Patient Consent Form
              </Button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
              <span>Consent Form is generated and ready for digital signature.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TREATMENT FORM & CLINICAL LOG */}
      <TreatmentForm appointmentId={appointmentId} visitStatus={currentVisitStatus} />
    </div>
  );
}
