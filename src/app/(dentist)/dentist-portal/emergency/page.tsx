"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { EmergencyButton } from "@/components/dentist-portal/emergency-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { declareEmergencyAction, getCurrentDentistAction } from "./actions";

export default function EmergencyPage() {
  const [dentistId, setDentistId] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentDentistAction().then((res) => {
      if (res.success && res.data) {
        setDentistId(res.data.id);
      }
      setIsLoading(false);
    });
  }, []);

  const handleActivate = async () => {
    if (!dentistId) return;
    const emergencyReason = reason.trim() || "Dental emergency — unable to continue appointments";
    const res = await declareEmergencyAction(dentistId, emergencyReason);
    if (res.success && res.data) {
      setResult({
        success: true,
        message: `Emergency declared successfully. ${res.data.affectedCount} appointment(s) marked for rescheduling. Staff has been notified.`,
      });
    } else {
      setResult({
        success: false,
        message: res.error ?? "Failed to declare emergency. Please call the clinic directly.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-4">
      <div className="text-center">
        <h1 className="text-xl font-bold">Emergency Declaration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Declare an emergency to notify staff and reschedule your appointments
        </p>
      </div>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          <div className="flex items-start gap-2">
            {result.success ? (
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <AlertDescription>{result.message}</AlertDescription>
          </div>
        </Alert>
      )}

      {result?.success ? (
        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Your appointments have been marked for rescheduling. The clinic staff will contact your patients.
          </p>
          <a
            href="/dentist-portal/schedule"
            className="block text-center text-sm font-medium text-primary"
          >
            Return to Schedule
          </a>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Briefly describe the emergency..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="rounded-lg border-2 border-red-200 bg-red-50/50 p-6">
            <EmergencyButton onActivate={handleActivate} />
          </div>

          <div className="space-y-2 rounded-lg border p-4">
            <h2 className="text-sm font-semibold">What happens when you declare an emergency?</h2>
            <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
              <li>Your remaining appointments today are marked for rescheduling</li>
              <li>Staff will be notified to contact affected patients</li>
              <li>Alternate dentists will be suggested for reassignment</li>
              <li>An audit log entry is created for this action</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
