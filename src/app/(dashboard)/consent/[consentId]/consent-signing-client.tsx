"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { SignaturePadHandle } from "@/components/consent/signature-pad";
import { signConsentAction } from "./actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, FileCheck, PenLine, Stethoscope, ArrowLeft, Printer } from "lucide-react";

const SignaturePad = dynamic(
  () => import("@/components/consent/signature-pad").then((m) => m.SignaturePad),
  { ssr: false, loading: () => (
    <div className="h-48 rounded-lg border-2 border-dashed border-muted-foreground/30 animate-pulse" />
  ) },
);

interface ConsentClauseView {
  formClauseId: string;
  title: string;
  bodyText: string;
  patientInitials: string | null;
}

interface ConsentSigningClientProps {
  consentId: string;
  appointmentId?: string | null;
  treatmentInfo: string;
  consentVersion: string;
  patientName: string;
  signedAt: string | null;
  signatureImageUrl: string | null;
  clauses: ConsentClauseView[];
}

export function ConsentSigningClient({
  consentId,
  appointmentId,
  treatmentInfo,
  consentVersion,
  patientName,
  signedAt,
  signatureImageUrl,
  clauses,
}: ConsentSigningClientProps) {
  const router = useRouter();
  const sigPadRef = useRef<SignaturePadHandle>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigned, setIsSigned] = useState(!!signedAt);
  const [initials, setInitials] = useState<Record<string, string>>(
    Object.fromEntries(clauses.map((c) => [c.formClauseId, c.patientInitials ?? ""])),
  );

  const allInitialed = clauses.every((c) => initials[c.formClauseId]?.trim());

  const handleSign = async () => {
    if (!allInitialed) {
      setError("Please initial every clause below before signing");
      return;
    }

    if (sigPadRef.current?.isEmpty()) {
      setError("Please provide a signature");
      return;
    }

    setIsSigning(true);
    setError(null);

    try {
      const signatureDataUrl = sigPadRef.current?.toDataURL() ?? "";
      const result = await signConsentAction(consentId, signatureDataUrl, initials);

      if (result.success) {
        setIsSigned(true);
        router.refresh();
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
      <div className="min-h-screen bg-gradient-to-br from-cyan-500/5 via-background to-teal-500/5 p-4 sm:p-6 print:p-0 print:bg-white">
        <div className="max-w-2xl mx-auto space-y-6 print:space-y-4">
          {/* VERIFIED SUCCESS HEADER */}
          <div className="bg-card p-5 rounded-2xl border border-emerald-500/30 shadow-xs print:hidden">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-xs shrink-0">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">Verified Informed Consent</h1>
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold">
                    Official Signed Waiver
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Patient: <span className="font-semibold text-foreground">{patientName}</span> · Signed: {new Date(signedAt ?? Date.now()).toLocaleString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true, month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          </div>

          {/* FULL SIGNED CONSENT DOCUMENT CARD */}
          <Card className="border border-border/80 bg-card rounded-2xl shadow-xs overflow-hidden print:border-none print:shadow-none">
            <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <FileCheck className="h-5 w-5 text-cyan-600" />
                  Informed Consent & Treatment Agreement (v{consentVersion})
                </CardTitle>
                <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10 uppercase font-bold">
                  Signed Document
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Official legal consent recorded for patient <span className="font-semibold text-foreground">{patientName}</span>.
              </p>
            </CardHeader>
            <CardContent className="p-5 space-y-5 text-xs">
              {/* TREATMENT INFO */}
              {treatmentInfo && (
                <div className="p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/15 text-cyan-900 dark:text-cyan-200">
                  <p className="text-[10px] uppercase font-bold text-cyan-600 mb-1">Treatment & Procedure Summary</p>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">{treatmentInfo}</p>
                </div>
              )}

              {/* ALL INITIALED CLAUSES */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-muted-foreground uppercase">
                  Agreed & Initialed Legal Clauses ({clauses.length})
                </p>
                <div className="space-y-2.5">
                  {clauses.map((clause) => (
                    <div key={clause.formClauseId} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground">{clause.title}</p>
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] font-bold font-mono">
                          Initialed: {initials[clause.formClauseId] || clause.patientInitials || "OK"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{clause.bodyText}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 text-center font-semibold text-foreground text-xs border border-border/40">
                I understand that dentistry is not an exact science and that no dentist can properly guarantee accurate results all the time.
              </div>

              {/* PATIENT DECLARATION & CAPTURED SIGNATURE */}
              <div className="p-4 rounded-2xl border border-border/80 bg-muted/10 space-y-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Patient Declaration & Digital Signature</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  I, <span className="font-bold text-foreground">{patientName}</span>, confirm that I have read, understood, and initialed each of the consent clauses above. I authorize the dentist and dental auxiliaries to proceed with & perform the treatments explained to me.
                </p>

                {signatureImageUrl && (
                  <div className="pt-2 flex flex-col items-start gap-1.5">
                    <span className="text-[10px] font-semibold text-muted-foreground">Captured Digital Signature:</span>
                    <div className="rounded-xl border border-border/80 p-3 bg-white shadow-2xs">
                      <img
                        src={signatureImageUrl}
                        alt="Patient signature"
                        className="h-20 object-contain max-w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* BOTTOM NAVIGATION ACTION BUTTONS */}
              <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row items-center gap-3 print:hidden">
                {appointmentId ? (
                  <Link href={`/consultation/${appointmentId}`} className="w-full sm:flex-1">
                    <Button size="lg" className="w-full h-10 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs">
                      <Stethoscope className="mr-2 h-4 w-4" /> Return to Clinical Consultation
                    </Button>
                  </Link>
                ) : (
                  <Link href="/consent" className="w-full sm:flex-1">
                    <Button size="lg" className="w-full h-10 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs">
                      <ArrowLeft className="mr-2 h-4 w-4" /> Return to Consent Desk
                    </Button>
                  </Link>
                )}

                <Button size="lg" variant="outline" onClick={() => window.print()} className="w-full sm:w-auto h-10 rounded-xl text-xs font-semibold border-border/80">
                  <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
              Informed Consent Clauses (v{consentVersion})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {treatmentInfo && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{treatmentInfo}</p>}
            {clauses.map((clause) => (
              <div key={clause.formClauseId} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                <p className="text-sm font-bold underline">{clause.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{clause.bodyText}</p>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs text-muted-foreground">Initial:</span>
                  <Input
                    value={initials[clause.formClauseId] ?? ""}
                    onChange={(e) =>
                      setInitials((prev) => ({ ...prev, [clause.formClauseId]: e.target.value }))
                    }
                    maxLength={5}
                    className="h-8 w-16 text-center text-xs font-bold uppercase"
                    placeholder="___"
                  />
                </div>
              </div>
            ))}
            <p className="text-sm font-semibold text-center pt-2 border-t">
              I understand that dentistry is not an exact science and that no dentist can properly guarantee accurate results all the time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Patient Declaration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              I, {patientName}, confirm that I have read and understood, and initialed, each of the
              consent clauses above. I authorize the dentist and dental auxiliaries to proceed with
              & perform the dental restorations & treatments as explained to me.
            </p>
            <SignaturePad ref={sigPadRef} label="Patient signature" />
            <Button
              onClick={handleSign}
              disabled={isSigning || !allInitialed}
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
            {!allInitialed && (
              <p className="text-xs text-center text-muted-foreground">Initial every clause above to enable signing</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
