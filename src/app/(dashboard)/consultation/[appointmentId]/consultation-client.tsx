"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { startConsultationAction, generateConsentAction } from "./actions";
import { TreatmentForm } from "./treatment-form";
import { Loader2, Stethoscope, FileCheck, User, Phone, Calendar, AlertTriangle } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consultation</h1>
          <p className="text-muted-foreground">
            {patientName} · {scheduledTime} · {dentistName}
          </p>
        </div>
        <Badge variant="outline" className="capitalize">
          {currentVisitStatus?.replace(/_/g, " ") ?? "Not started"}
        </Badge>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{patientName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{patientContact}</span>
              </div>
              {patientBirthDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>DOB: {patientBirthDate}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Medical History</CardTitle>
            </CardHeader>
            <CardContent>
              {patientMedicalHistory ? (
                <p className="text-sm">{patientMedicalHistory}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No medical history recorded</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Allergies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patientAllergies ? (
                <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">
                  {patientAllergies}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No known allergies</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Scheduled Services</CardTitle>
            </CardHeader>
            <CardContent>
              {services.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {services.map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No services selected</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Consultation Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canStartConsultation && (
                <Button
                  onClick={handleStartConsultation}
                  disabled={isStarting}
                  className="w-full"
                >
                  {isStarting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Stethoscope className="mr-2 h-4 w-4" />
                  )}
                  Start Consultation
                </Button>
              )}

              {currentVisitStatus === "in_consultation" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="treatment_info">Treatment Information (for Consent)</Label>
                    <Textarea
                      id="treatment_info"
                      value={treatmentInfo}
                      onChange={(e) => setTreatmentInfo(e.target.value)}
                      placeholder="Describe the treatment procedure, risks, and alternatives..."
                      rows={4}
                      disabled={consentCreated}
                    />
                  </div>
                  {consentCreated ? (
                    <Alert>
                      <FileCheck className="h-4 w-4" />
                      <AlertDescription>
                        Consent form generated. Direct patient to the consent signing screen.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Button
                      onClick={handleGenerateConsent}
                      disabled={isGeneratingConsent || !treatmentInfo.trim()}
                      className="w-full"
                    >
                      {isGeneratingConsent ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileCheck className="mr-2 h-4 w-4" />
                      )}
                      Generate Consent Form
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {(currentVisitStatus === "in_consultation" ||
        currentVisitStatus === "treatment_ongoing" ||
        currentVisitStatus === "treatment_paused" ||
        currentVisitStatus === "completed") && (
        <TreatmentForm appointmentId={appointmentId} visitStatus={currentVisitStatus} />
      )}
    </div>
  );
}
