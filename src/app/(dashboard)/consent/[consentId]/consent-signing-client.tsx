"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { SignaturePadHandle } from "@/components/consent/signature-pad";
import { signConsentAction } from "./actions";
import { Loader2, CheckCircle2, FileCheck, PenLine } from "lucide-react";

const SignaturePad = dynamic(
  () => import("@/components/consent/signature-pad").then((m) => m.SignaturePad),
  { ssr: false, loading: () => (
    <div className="h-48 rounded-lg border-2 border-dashed border-muted-foreground/30 animate-pulse" />
  ) },
);

interface ConsentSigningClientProps {
  consentId: string;
  treatmentInfo: string;
  consentVersion: string;
  patientName: string;
  signedAt: string | null;
  signatureImageUrl: string | null;
}

export function ConsentSigningClient({
  consentId,
  treatmentInfo,
  consentVersion,
  patientName,
  signedAt,
  signatureImageUrl,
}: ConsentSigningClientProps) {
  const sigPadRef = useRef<SignaturePadHandle>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState(!!signedAt);

  const handleSign = async () => {
    if (sigPadRef.current?.isEmpty()) {
      setError("Please provide a signature");
      return;
    }

    setIsSigning(true);
    setError(null);

    try {
      const signatureDataUrl = sigPadRef.current?.toDataURL() ?? "";
      const result = await signConsentAction(consentId, signatureDataUrl);

      if (result.success) {
        setIsSigned(true);
      } else {
        setError(result.error ?? "Failed to save signature");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSigning(false);
    }
  };

  if (isSigned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-background p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h1 className="text-xl font-bold">Consent Form Signed</h1>
            <p className="text-muted-foreground">
              Thank you, {patientName}. Your consent has been recorded.
            </p>
            {signatureImageUrl && (
              <div className="rounded-lg border p-2 bg-white">
                <img
                  src={signatureImageUrl}
                  alt="Patient signature"
                  className="h-24"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Signed at: {new Date(signedAt ?? Date.now()).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <PenLine className="h-10 w-10 text-primary mx-auto mb-2" />
          <h1 className="text-2xl font-bold">Informed Consent Form</h1>
          <p className="text-muted-foreground">Patient: {patientName}</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Treatment Information (v{consentVersion})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{treatmentInfo}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Patient Declaration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              I, {patientName}, confirm that I have read and understood the treatment
              information provided above. I consent to the described dental treatment
              and acknowledge that I have had the opportunity to ask questions.
            </p>
            <SignaturePad ref={sigPadRef} label="Patient signature" />
            <Button
              onClick={handleSign}
              disabled={isSigning}
              size="lg"
              className="w-full"
            >
              {isSigning ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <PenLine className="mr-2 h-5 w-5" />
              )}
              Sign & Submit
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
