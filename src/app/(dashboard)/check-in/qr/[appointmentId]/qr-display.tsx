"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateQrCodeAction, getActiveQrCodeAction } from "../actions";
import { Loader2, RefreshCw, QrCode as QrCodeIcon, Clock } from "lucide-react";

interface QrDisplayProps {
  appointmentId: string;
  patientName: string;
  referenceNo: string;
  registrationUrl: string;
}

export function QrDisplay({ appointmentId, patientName, referenceNo, registrationUrl }: QrDisplayProps) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const loadExisting = useCallback(async () => {
    setIsLoading(true);
    const result = await getActiveQrCodeAction(appointmentId);
    setIsLoading(false);

    if (result.success && result.data) {
      setToken(result.data.token);
      setExpiresAt(result.data.expiresAt);
    }
  }, [appointmentId]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  useEffect(() => {
    if (!expiresAt) return;

    const updateRemaining = () => {
      const remaining = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setRemainingSeconds(Math.max(0, remaining));

      if (remaining <= 0) {
        setToken(null);
        setExpiresAt(null);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    const result = await generateQrCodeAction(appointmentId);
    setIsGenerating(false);

    if (result.success && result.data) {
      setToken(result.data.token);
      setExpiresAt(result.data.expiresAt);
    } else {
      setError(result.error ?? "Failed to generate QR code");
    }
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isExpired = !token || remainingSeconds <= 0;
  const qrUrl = token ? `${registrationUrl}/${token}` : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">QR Code for Registration</h1>
        <p className="text-muted-foreground">
          {patientName} · Ref: {referenceNo}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <QrCodeIcon className="h-5 w-5" />
            Registration QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isExpired ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <p className="text-muted-foreground text-center">
                {token === null && !expiresAt
                  ? "No active QR code. Generate one for the patient to scan."
                  : "QR code has expired. Generate a new one."}
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {token === null && !expiresAt ? "Generate QR Code" : "Regenerate QR Code"}
              </Button>
            </div>
          ) : (
            <>
              <div className="p-4 bg-white rounded-lg border">
                <QRCodeSVG
                  value={qrUrl}
                  size={256}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className={remainingSeconds < 60 ? "text-destructive font-medium" : ""}>
                  Expires in {minutes}:{String(seconds).padStart(2, "0")}
                </span>
              </div>
              <Button onClick={handleGenerate} variant="outline" size="sm" disabled={isGenerating}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
