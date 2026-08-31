"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateConsentAction } from "./actions";
import { Loader2, FileCheck } from "lucide-react";
import type { ConsentClause } from "@/lib/types/database";

interface ConsentFormGeneratorProps {
  appointmentId: string;
  consentClauses: ConsentClause[];
  hasConsent: boolean;
  onGenerated: () => void;
  onError: (message: string) => void;
}

export function ConsentFormGenerator({
  appointmentId,
  consentClauses,
  hasConsent,
  onGenerated,
  onError,
}: ConsentFormGeneratorProps) {
  const [selectedClauseIds, setSelectedClauseIds] = useState<string[]>([]);
  const [treatmentInfo, setTreatmentInfo] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [consentCreated, setConsentCreated] = useState(hasConsent);

  const toggleClause = (id: string) => {
    setSelectedClauseIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleGenerate = async () => {
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
      } else {
        onError(result.error ?? "Failed to generate consent");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
      <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-cyan-600" /> Informed Consent Form (PDA Dental Chart)
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
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">
                Select applicable consent clauses for this treatment *
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto p-1">
                {consentClauses.map((clause) => (
                  <label
                    key={clause.id}
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/30 cursor-pointer hover:bg-cyan-500/10"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 mt-0.5 accent-cyan-600 shrink-0"
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
              disabled={isGenerating || selectedClauseIds.length === 0}
              className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs"
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
