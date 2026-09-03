"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateConsentAction } from "./actions";
import { Loader2, FileCheck, AlertCircle, Lock } from "lucide-react";
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
              <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">
                Select applicable consent clauses for this treatment *
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto p-1">
                {consentClauses.map((clause) => (
                  <label
                    key={clause.id}
                    className={`flex items-start gap-2 p-2.5 rounded-xl bg-muted/30 ${
                      isConsultationStarted ? "cursor-pointer hover:bg-cyan-500/10" : "cursor-not-allowed"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!isConsultationStarted}
                      className="h-4 w-4 mt-0.5 accent-cyan-600 shrink-0 disabled:cursor-not-allowed"
                      checked={selectedClauseIds.includes(clause.id)}
                      onChange={() => toggleClause(clause.id)}
                    />
                    <div>
                      <p className="font-bold text-foreground">{clause.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{clause.body_text}</p>
                    </div>
                  </label>
                ))}
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
              className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileCheck className="mr-1.5 h-3.5 w-3.5" />}
              Generate Patient Consent Form ({selectedClauseIds.length} clause{selectedClauseIds.length === 1 ? "" : "s"})
            </Button>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
            <span>Consent Form is generated and ready for digital signature.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
