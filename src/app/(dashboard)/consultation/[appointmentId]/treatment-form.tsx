"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DentalChartPanel } from "@/components/dental-chart/dental-chart-panel";
import { DentalChartSnapshotViewer } from "@/components/dental-chart/dental-chart-snapshot-viewer";
import {
  saveTreatmentRecordAction,
  pauseTreatmentAction,
  resumeTreatmentAction,
  completeTreatmentAction,
  startTreatmentAction,
  getTreatmentRecordAction,
} from "./treatment-actions";
import { Loader2, Save, Pause, Play, CheckCircle, FileSignature, AlertCircle } from "lucide-react";
import Link from "next/link";
import type { DentalChart, ToothPresence, ToothFinding } from "@/lib/types/database";

interface TreatmentFormProps {
  appointmentId: string;
  patientId: string;
  visitStatus: string;
  hasConsent?: boolean;
  isConsentSigned?: boolean;
  dentalChart: DentalChart;
  dentalChartPresence: ToothPresence[];
  dentalChartFindings: ToothFinding[];
}

export function TreatmentForm({ appointmentId, patientId, visitStatus, hasConsent = false, isConsentSigned = false, dentalChart, dentalChartPresence, dentalChartFindings }: TreatmentFormProps) {
  const router = useRouter();
  const [diagnosis, setDiagnosis] = useState("");
  const [procedures, setProcedures] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [prescriptions, setPrescriptions] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentVisitStatus, setCurrentVisitStatus] = useState(visitStatus);
  const [isLoading, setIsLoading] = useState(true);

  const loadTreatmentRecord = useCallback(async () => {
    const result = await getTreatmentRecordAction(appointmentId);
    setIsLoading(false);

    if (result.success && result.data) {
      setDiagnosis(result.data.diagnosis ?? "");
      setProcedures(result.data.procedures ?? "");
      setClinicalNotes(result.data.clinical_notes ?? "");
      setPrescriptions(result.data.prescriptions ?? "");
      setTreatmentPlan(result.data.treatment_plan ?? "");
    }
  }, [appointmentId]);

  useEffect(() => {
    loadTreatmentRecord();
  }, [loadTreatmentRecord]);

  const handleStartTreatment = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const result = await startTreatmentAction(appointmentId);
      if (result.success) {
        setCurrentVisitStatus("treatment_ongoing");
        setSuccess("Treatment started");
        router.refresh();
      } else {
        setError(result.error ?? "Failed to start treatment");
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await saveTreatmentRecordAction(appointmentId, {
        diagnosis,
        procedures,
        clinical_notes: clinicalNotes,
        prescriptions,
        treatment_plan: treatmentPlan,
      });

      if (result.success) {
        setSuccess("Treatment record saved");
        router.refresh();
      } else {
        setError(result.error ?? "Failed to save");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePause = async () => {
    if (!pauseReason.trim()) {
      setError("Pause reason is required");
      return;
    }

    setIsPausing(true);
    setError(null);

    try {
      const result = await pauseTreatmentAction(appointmentId, pauseReason);
      if (result.success) {
        setCurrentVisitStatus("treatment_paused");
        setShowPauseDialog(false);
        setPauseReason("");
        setSuccess("Treatment paused");
        router.refresh();
      } else {
        setError(result.error ?? "Failed to pause");
      }
    } finally {
      setIsPausing(false);
    }
  };

  const handleResume = async () => {
    setIsResuming(true);
    setError(null);

    try {
      const result = await resumeTreatmentAction(appointmentId);
      if (result.success) {
        setCurrentVisitStatus("treatment_ongoing");
        setSuccess("Treatment resumed");
        router.refresh();
      } else {
        setError(result.error ?? "Failed to resume");
      }
    } finally {
      setIsResuming(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    setError(null);

    try {
      const result = await completeTreatmentAction(appointmentId);
      if (result.success) {
        setCurrentVisitStatus("completed");
        setSuccess("Treatment completed");
        router.refresh();
      } else {
        setError(result.error ?? "Failed to complete");
      }
    } finally {
      setIsCompleting(false);
    }
  };

  const canStartTreatment = currentVisitStatus === "in_consultation";
  const isPaused = currentVisitStatus === "treatment_paused";
  const isOngoing = currentVisitStatus === "treatment_ongoing";
  const isCompleted = currentVisitStatus === "completed";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <DentalChartPanel patientId={patientId} chart={dentalChart} presence={dentalChartPresence} findings={dentalChartFindings} />

      <DentalChartSnapshotViewer patientId={patientId} />

      <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Clinical Documentation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Textarea
                  id="diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={2}
                  placeholder="Primary diagnosis..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="procedures">Procedures Performed</Label>
                <Textarea
                  id="procedures"
                  value={procedures}
                  onChange={(e) => setProcedures(e.target.value)}
                  rows={3}
                  placeholder="Procedures done in this visit..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinical_notes">Clinical Notes</Label>
                <Textarea
                  id="clinical_notes"
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  rows={3}
                  placeholder="Observations, findings..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prescriptions">Prescriptions</Label>
                <Textarea
                  id="prescriptions"
                  value={prescriptions}
                  onChange={(e) => setPrescriptions(e.target.value)}
                  rows={2}
                  placeholder="Medications prescribed..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="treatment_plan">Treatment Plan</Label>
                <Textarea
                  id="treatment_plan"
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  rows={2}
                  placeholder="Future treatment recommendations..."
                />
              </div>
            </CardContent>
          </Card>



          {showPauseDialog && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Label htmlFor="pause_reason">Reason for pausing treatment</Label>
                <Input
                  id="pause_reason"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="e.g., Patient needs break, waiting for X-ray..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button onClick={handlePause} disabled={isPausing} size="sm">
                    {isPausing ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <Pause className="mr-2 h-3 w-3" />
                    )}
                    Confirm Pause
                  </Button>
                  <Button
                    onClick={() => setShowPauseDialog(false)}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
      </div>

      {/* FLOATING STICKY QUICK ACTION BAR (ALWAYS VISIBLE WITHOUT SCROLLING) */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 p-2.5 px-4 rounded-2xl bg-card/95 backdrop-blur-md border border-cyan-500/30 shadow-2xl animate-in fade-in slide-in-from-bottom-5">
        <div className="flex items-center gap-2 border-r border-border/60 pr-3">
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 bg-cyan-500/10 text-[10px] font-mono uppercase font-bold">
            {currentVisitStatus.replace(/_/g, " ")}
          </Badge>
        </div>

        {/* SAVE RECORD BUTTON */}
        <Button onClick={handleSave} disabled={isSaving} size="sm" variant="outline" className="h-9 rounded-xl text-xs border-border/80 shadow-2xs">
          {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5 text-cyan-600" />}
          Save Record
        </Button>

        {/* START / PAUSE / RESUME / COMPLETE ACTIONS */}
        {canStartTreatment && (
          !hasConsent ? (
            <Button size="sm" disabled variant="outline" className="h-9 rounded-xl text-xs font-medium border-amber-500/30 text-amber-600 bg-amber-500/10 cursor-not-allowed opacity-80">
              <AlertCircle className="mr-1.5 h-3.5 w-3.5 text-amber-600" /> Generate Consent Form First
            </Button>
          ) : !isConsentSigned ? (
            <Link href={`/consent/${appointmentId}`}>
              <Button size="sm" className="h-9 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-2xs">
                <FileSignature className="mr-1.5 h-3.5 w-3.5" /> Sign Consent Waiver
              </Button>
            </Link>
          ) : (
            <Button onClick={handleStartTreatment} disabled={isStarting} size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs">
              {isStarting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
              Start Procedure Treatment
            </Button>
          )
        )}

        {isOngoing && (
          <>
            <Button onClick={() => setShowPauseDialog(true)} disabled={isPausing} size="sm" variant="outline" className="h-9 rounded-xl text-xs border-amber-500/30 text-amber-600 font-semibold">
              <Pause className="mr-1.5 h-3.5 w-3.5" /> Pause
            </Button>
            <Button onClick={handleComplete} disabled={isCompleting} size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-2xs">
              {isCompleting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1.5 h-3.5 w-3.5" />}
              Complete Treatment
            </Button>
          </>
        )}

        {isPaused && (
          <>
            <Button onClick={handleResume} disabled={isResuming} size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs">
              {isResuming ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
              Resume
            </Button>
            <Button onClick={handleComplete} disabled={isCompleting} size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-2xs">
              {isCompleting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1.5 h-3.5 w-3.5" />}
              Complete Treatment
            </Button>
          </>
        )}

        {isCompleted && (
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-xs font-bold py-1 px-3">
            <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Treatment Completed
          </Badge>
        )}
      </div>
    </div>
  );
}
