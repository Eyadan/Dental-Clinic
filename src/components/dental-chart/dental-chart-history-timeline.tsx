"use client";

import { useEffect, useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, History, ArrowRight, Plus, Pencil, Trash2, CircleDot } from "lucide-react";
import { getChartHistoryAction } from "@/app/(dashboard)/patients/[id]/dental-chart-actions";
import type { DentalChartHistory } from "@/lib/types/database";

interface DentalChartHistoryTimelineProps {
  patientId: string;
}

const FIELD_LABELS: Record<string, string> = {
  created: "Chart Created",
  periodontal_gingivitis: "Gingivitis",
  periodontal_early_periodontitis: "Early Periodontitis",
  periodontal_moderate_periodontitis: "Moderate Periodontitis",
  periodontal_advanced_periodontitis: "Advanced Periodontitis",
  occlusion_class_molar: "Class (Molar)",
  occlusion_overjet: "Overjet",
  occlusion_overbite: "Overbite",
  occlusion_midline_deviation: "Midline Deviation",
  occlusion_crossbite: "Crossbite",
  appliance_orthodontic: "Orthodontic Appliance",
  appliance_stayplate: "Stayplate",
  appliance_others: "Appliance Others",
  tmd_clenching: "TMD Clenching",
  tmd_clicking: "TMD Clicking",
  tmd_trismus: "TMD Trismus",
  tmd_muscle_spasm: "TMD Muscle Spasm",
  xray_periapical: "X-ray Periapical",
  xray_periapical_tooth_no: "X-ray Periapical Tooth No.",
  xray_panoramic: "X-ray Panoramic",
  xray_cephalometric: "X-ray Cephalometric",
  xray_occlusal: "X-ray Occlusal",
  xray_others: "X-ray Others",
  presence: "Tooth Presence",
  category: "Finding Category",
  code: "Finding Code",
  notes: "Notes",
  tooth_number: "Tooth Number",
};

const ENTITY_LABELS: Record<string, string> = {
  chart_meta: "Chart Metadata",
  tooth_presence: "Tooth Presence",
  tooth_finding: "Tooth Finding",
};

const ACTION_CONFIG: Record<string, { icon: typeof Plus; color: string; bg: string }> = {
  insert: { icon: Plus, color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30" },
  update: { icon: Pencil, color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/30" },
  delete: { icon: Trash2, color: "text-red-600", bg: "bg-red-500/10 border-red-500/30" },
};

function formatValue(value: string | null): string {
  if (value === null || value === "") return "—";
  if (value === "true") return "Yes";
  if (value === "false") return "No";
  return value;
}

export const DentalChartHistoryTimeline = memo(function DentalChartHistoryTimeline({
  patientId,
}: DentalChartHistoryTimelineProps) {
  const [entries, setEntries] = useState<DentalChartHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getChartHistoryAction(patientId).then((res) => {
      if (res.success && res.data) {
        setEntries(res.data);
      } else {
        setError(res.error ?? "Failed to load history");
      }
      setIsLoading(false);
    });
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
      <CardHeader className="border-b border-border/40 pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <History className="h-4 w-4 text-cyan-600" /> Dental Chart Audit History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No changes recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {entries.map((entry, index) => {
              const actionCfg = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.update;
              const ActionIcon = actionCfg.icon;
              const fieldLabel = FIELD_LABELS[entry.field ?? ""] ?? (entry.field ?? "unknown").replace(/_/g, " ");
              const entityLabel = ENTITY_LABELS[entry.entity_type] ?? entry.entity_type;
              const isLast = index === entries.length - 1;

              return (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${actionCfg.bg}`}>
                      <ActionIcon className={`h-3.5 w-3.5 ${actionCfg.color}`} />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-border" />}
                  </div>

                  <div className="flex-1 pb-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {entry.action}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground">{entityLabel}</span>
                        {entry.tooth_number !== null && (
                          <Badge variant="secondary" className="text-[10px] flex items-center gap-0.5">
                            <CircleDot className="h-2.5 w-2.5" /> {entry.tooth_number}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(entry.changed_at).toLocaleString("en-PH", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground font-medium">{fieldLabel}</span>
                      {(entry.action === "update" || entry.action === "insert") && (
                        <>
                          {entry.old_value && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground line-through text-[11px]">
                              {formatValue(entry.old_value)}
                            </span>
                          )}
                          {entry.action === "update" && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                          {entry.new_value && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary text-[11px]">
                              {formatValue(entry.new_value)}
                            </span>
                          )}
                        </>
                      )}
                      {entry.action === "delete" && (
                        <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-600 text-[11px] font-medium">
                          Removed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
