"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DentalChart,
  type ToothData,
  type ToothStatus,
} from "@/components/dental-chart/dental-chart";
import {
  saveTreatmentRecordAction,
  pauseTreatmentAction,
  resumeTreatmentAction,
  completeTreatmentAction,
  getTreatmentRecordAction,
} from "./treatment-actions";
import { Loader2, Save, Pause, Play, CheckCircle, Activity } from "lucide-react";

interface TreatmentFormProps {
  appointmentId: string;
  visitStatus: string;
}

const STATUS_OPTIONS: { value: ToothStatus; label: string }[] = [
  { value: "healthy", label: "Healthy" },
  { value: "decayed", label: "Decayed" },
  { value: "filled", label: "Filled" },
  { value: "extracted", label: "Extracted" },
  { value: "crown", label: "Crown" },
  { value: "implant", label: "Implant" },
  { value: "root_canal", label: "Root Canal" },
  { value: "bridge", label: "Bridge" },
];

export function TreatmentForm({ appointmentId, visitStatus }: TreatmentFormProps) {
  const [diagnosis, setDiagnosis] = useState("");
  const [procedures, setProcedures] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [prescriptions, setPrescriptions] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [toothChart, setToothChart] = useState<ToothData[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<ToothData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
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

  const handleToothClick = (tooth: ToothData) => {
    setSelectedTooth(tooth);
  };

  const handleToothStatusChange = (status: ToothStatus) => {
    if (!selectedTooth) return;

    const existing = toothChart.find((t) => t.number === selectedTooth.number);
    if (existing) {
      setToothChart((prev) =>
        prev.map((t) =>
          t.number === selectedTooth.number
            ? { ...t, status }
            : t,
        ),
      );
    } else {
      setToothChart((prev) => [...prev, { number: selectedTooth.number, status }]);
    }

    setSelectedTooth((prev) => prev ? { ...prev, status } : prev);
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
        tooth_chart: toothChart,
      });

      if (result.success) {
        setSuccess("Treatment record saved");
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Dental Chart (FDI/ISO 3950)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DentalChart
              teeth={toothChart}
              onToothClick={handleToothClick}
            />
            {selectedTooth && (
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-medium">
                  Tooth {selectedTooth.number}: {selectedTooth.status}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={selectedTooth.status === opt.value ? "default" : "outline"}
                      onClick={() => handleToothStatusChange(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={isSaving} variant="outline">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>

            {canStartTreatment && (
              <Button
                onClick={() => setCurrentVisitStatus("treatment_ongoing")}
                disabled={isCompleting}
              >
                <Play className="mr-2 h-4 w-4" />
                Start Treatment
              </Button>
            )}

            {isOngoing && (
              <Button
                onClick={() => setShowPauseDialog(true)}
                variant="outline"
                disabled={isPausing}
              >
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            )}

            {isPaused && (
              <>
                <Button onClick={handleResume} disabled={isResuming}>
                  {isResuming ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Resume
                </Button>
                <div className="w-full space-y-2 mt-2">
                  <p className="text-sm text-muted-foreground">
                    Paused at: {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </>
            )}

            {(isOngoing || isPaused) && (
              <Button onClick={handleComplete} disabled={isCompleting} variant="default">
                {isCompleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Complete
              </Button>
            )}

            {isCompleted && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Treatment completed</AlertDescription>
              </Alert>
            )}
          </div>

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
      </div>
    </div>
  );
}
