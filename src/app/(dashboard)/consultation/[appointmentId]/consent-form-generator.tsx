"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateConsentAction } from "./actions";
import { DEFAULT_PDA_CONSENT_CLAUSES } from "@/lib/constants/consent-clauses";
import {
  Loader2,
  FileCheck,
  Lock,
  FileSignature,
  CheckCheck,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import type { ConsentClause } from "@/lib/types/database";

interface ConsentFormGeneratorProps {
  appointmentId: string;
  visitStatus?: string;
  consentClauses: ConsentClause[];
  hasConsent: boolean;
  onGenerated: () => void;
  onError: (message: string) => void;
}

export function ConsentFormGenerator({
  appointmentId,
  visitStatus = "waiting",
  consentClauses,
  hasConsent,
  onGenerated,
  onError,
}: ConsentFormGeneratorProps) {
  const router = useRouter();

  // Safeguard: if server passed an empty list, fallback to standard PDA clauses
  const activeClauses =
    consentClauses && consentClauses.length > 0
      ? consentClauses
      : DEFAULT_PDA_CONSENT_CLAUSES;

  const [selectedClauseIds, setSelectedClauseIds] = useState<string[]>([]);
  const [treatmentInfo, setTreatmentInfo] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [consentCreated, setConsentCreated] = useState(hasConsent);

  const isConsultationStarted = !["waiting", "checked_in"].includes(visitStatus);

  const toggleClause = (id: string) => {
    if (!isConsultationStarted) return;
    setSelectedClauseIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const selectAllClauses = () => {
    if (!isConsultationStarted) return;
    setSelectedClauseIds(activeClauses.map((c) => c.id));
  };

  const deselectAllClauses = () => {
    if (!isConsultationStarted) return;
    setSelectedClauseIds([]);
  };

  const handleGenerate = async () => {
    if (!isConsultationStarted) {
      onError('Please click "Start Clinical Consultation" at the top before generating consent');
      return;
    }
    if (selectedClauseIds.length === 0) {
      onError("Select at least one applicable consent clause");
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateConsentAction(appointmentId, treatmentInfo, selectedClauseIds);
      if (result.success) {
        setConsentCreated(true);
        onGenerated();
        router.refresh();
      } else {
        onError(result.error ?? "Failed to generate consent");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/40 pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          <FileCheck className="h-4 w-4 text-cyan-600" /> Informed Consent Form (PDA Dental Chart)
        </CardTitle>
        {consentCreated && (
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] font-bold">
            Consent Form Generated
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-3 text-xs">
        {!isConsultationStarted && !consentCreated && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 mb-2">
            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="text-xs font-semibold">
              Clinical Consultation has not started yet. Please click <span className="font-bold text-cyan-700 dark:text-cyan-400">"Start Clinical Consultation"</span> at the top before selecting consent clauses and generating waiver forms.
            </div>
          </div>
        )}

        {!consentCreated ? (
          <div className={`space-y-3 ${!isConsultationStarted ? "opacity-60 pointer-events-none" : ""}`}>
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase">
                  Select applicable consent clauses for this treatment *
                </p>
                {isConsultationStarted && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllClauses}
                      className="text-[11px] font-semibold text-cyan-600 hover:text-cyan-700 hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="h-3 w-3" /> Select All ({activeClauses.length})
                    </button>
                    <span className="text-muted-foreground/40 text-[11px]">|</span>
                    <button
                      type="button"
                      onClick={deselectAllClauses}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="h-2.5 w-2.5" /> Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-72 sm:max-h-80 overflow-y-auto p-1 rounded-xl border border-border/40 bg-muted/10 divide-y divide-border/30">
                {activeClauses.map((clause, idx) => {
                  const isChecked = selectedClauseIds.includes(clause.id);
                  return (
                    <label
                      key={clause.id}
                      className={`flex items-start gap-3 p-3 transition-colors ${
                        isConsultationStarted ? "cursor-pointer hover:bg-cyan-500/10" : "cursor-not-allowed"
                      } ${isChecked ? "bg-cyan-500/10 dark:bg-cyan-950/20" : ""}`}
                    >
                      <input
                        type="checkbox"
                        disabled={!isConsultationStarted}
                        className="h-4.5 w-4.5 mt-0.5 accent-cyan-600 shrink-0 rounded cursor-pointer disabled:cursor-not-allowed"
                        checked={isChecked}
                        onChange={() => toggleClause(clause.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-cyan-600/80 dark:text-cyan-400/80 bg-cyan-500/10 px-1.5 py-0.5 rounded-md">
                            #{clause.sort_order || idx + 1}
                          </span>
                          <p className="font-bold text-foreground text-xs leading-snug">{clause.title}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{clause.body_text}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="treatmentInfo" className="text-xs font-semibold text-muted-foreground">
                Additional Treatment Notes (optional)
              </Label>
              <Textarea
                id="treatmentInfo"
                disabled={!isConsultationStarted}
                placeholder="Specific procedure details, risks, or post-op care instructions..."
                value={treatmentInfo}
                onChange={(e) => setTreatmentInfo(e.target.value)}
                rows={2}
                className="text-xs border-border/80 rounded-xl"
              />
            </div>

            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={!isConsultationStarted || isGenerating || selectedClauseIds.length === 0}
              className="w-full sm:w-auto h-9.5 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileCheck className="mr-1.5 h-3.5 w-3.5" />}
              Generate Patient Consent Form ({selectedClauseIds.length} clause{selectedClauseIds.length === 1 ? "" : "s"})
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                Consent Form is generated and ready for digital signature.
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <Link href={`/consent/${appointmentId}`} className="flex-1">
                <Button
                  size="sm"
                  className="w-full h-9.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center justify-center gap-2"
                >
                  <FileSignature className="h-4 w-4" />
                  Open Mobile / Tablet Consent Signing Screen
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                </Button>
              </Link>
              <Link href="/consent">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto h-9.5 rounded-xl text-xs font-semibold border-border/80 text-foreground hover:bg-muted"
                >
                  View All Consents
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
