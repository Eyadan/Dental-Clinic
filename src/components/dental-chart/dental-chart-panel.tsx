"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Stethoscope } from "lucide-react";
import type { DentalChart, ToothPresence, ToothFinding } from "@/lib/types/database";
import type { ToothSurface, ToothPresenceStatus, ToothFindingCategory } from "@/lib/types/enums";
import type { DentalChartMetaInput } from "@/lib/validations/dental-chart.schema";
import {
  updateDentalChartMetaAction,
  upsertPresenceAction,
  addFindingAction,
  deleteFindingAction,
  clearToothAction,
} from "@/app/(dashboard)/patients/[id]/dental-chart-actions";
import { DentalChartGrid } from "./dental-chart-grid";
import { DentalChartLegend } from "./dental-chart-legend";
import { DentalChartScreening } from "./dental-chart-screening";
import { ToothEditor } from "./tooth-editor";

interface DentalChartPanelProps {
  patientId: string;
  chart: DentalChart;
  presence: ToothPresence[];
  findings: ToothFinding[];
  readOnly?: boolean;
}

export function DentalChartPanel({ patientId, chart, presence, findings, readOnly = false }: DentalChartPanelProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [selectedSurfaces, setSelectedSurfaces] = useState<Set<ToothSurface>>(new Set());
  const [showTemporary, setShowTemporary] = useState(false);
  const [meta, setMeta] = useState<DentalChartMetaInput>({
    periodontal_gingivitis: chart.periodontal_gingivitis,
    periodontal_early_periodontitis: chart.periodontal_early_periodontitis,
    periodontal_moderate_periodontitis: chart.periodontal_moderate_periodontitis,
    periodontal_advanced_periodontitis: chart.periodontal_advanced_periodontitis,
    occlusion_class_molar: chart.occlusion_class_molar,
    occlusion_overjet: chart.occlusion_overjet,
    occlusion_overbite: chart.occlusion_overbite,
    occlusion_midline_deviation: chart.occlusion_midline_deviation,
    occlusion_crossbite: chart.occlusion_crossbite,
    appliance_orthodontic: chart.appliance_orthodontic,
    appliance_stayplate: chart.appliance_stayplate,
    appliance_others: chart.appliance_others,
    tmd_clenching: chart.tmd_clenching,
    tmd_clicking: chart.tmd_clicking,
    tmd_trismus: chart.tmd_trismus,
    tmd_muscle_spasm: chart.tmd_muscle_spasm,
    xray_periapical: chart.xray_periapical,
    xray_periapical_tooth_no: chart.xray_periapical_tooth_no,
    xray_panoramic: chart.xray_panoramic,
    xray_cephalometric: chart.xray_cephalometric,
    xray_occlusal: chart.xray_occlusal,
    xray_others: chart.xray_others,
  });
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const presenceMap = useMemo(() => new Map(presence.map((p) => [p.tooth_number, p])), [presence]);
  const findingsMap = useMemo(() => {
    const map = new Map<number, ToothFinding[]>();
    for (const f of findings) {
      const existing = map.get(f.tooth_number) ?? [];
      existing.push(f);
      map.set(f.tooth_number, existing);
    }
    return map;
  }, [findings]);

  const notify = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 2500);
  };

  const handleToothClick = (toothNumber: number) => {
    if (readOnly) return;
    setSelectedTooth(toothNumber);
    setSelectedSurfaces(new Set());
  };

  const toggleSurface = (surface: ToothSurface) => {
    setSelectedSurfaces((prev) => {
      const next = new Set(prev);
      if (next.has(surface)) {
        next.delete(surface);
      } else {
        next.add(surface);
      }
      return next;
    });
  };

  const handleSurfaceClick = (toothNumber: number, surface: ToothSurface) => {
    if (readOnly) return;
    if (selectedTooth !== toothNumber) {
      setSelectedTooth(toothNumber);
      setSelectedSurfaces(new Set([surface]));
    } else {
      toggleSurface(surface);
    }
  };

  const handlePresenceChange = async (p: ToothPresenceStatus) => {
    if (!selectedTooth) return;
    const result = await upsertPresenceAction(patientId, { tooth_number: selectedTooth, presence: p });
    if (!result.success) setError(result.error ?? "Failed to update presence");
  };

  const handleAddFinding = async (category: ToothFindingCategory, code: string, surfaces: ToothSurface[]) => {
    if (!selectedTooth) return;
    const result = await addFindingAction(patientId, { tooth_number: selectedTooth, category, code, surfaces });
    if (!result.success) setError(result.error ?? "Failed to add finding");
  };

  const handleDeleteFinding = async (findingId: string) => {
    const result = await deleteFindingAction(patientId, findingId);
    if (!result.success) setError(result.error ?? "Failed to delete finding");
  };

  const handleClearTooth = async () => {
    if (!selectedTooth) return;
    const result = await clearToothAction(patientId, selectedTooth);
    if (result.success) {
      setSelectedSurfaces(new Set());
      notify(`Tooth ${selectedTooth} findings cleared`);
    } else {
      setError(result.error ?? "Failed to clear tooth");
    }
  };

  const handleSaveMeta = async () => {
    setIsSavingMeta(true);
    setError(null);
    try {
      const result = await updateDentalChartMetaAction(patientId, meta);
      if (result.success) {
        notify("Screening findings saved");
      } else {
        setError(result.error ?? "Failed to save screening findings");
      }
    } finally {
      setIsSavingMeta(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <AlertDescription className="text-xs font-semibold">{success}</AlertDescription>
        </Alert>
      )}

      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
        <CardHeader className="border-b border-border/40 pb-3 flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-cyan-600" /> Dental Record Chart (FDI Notation)
          </CardTitle>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground">Show Temporary Teeth</span>
              <Switch checked={showTemporary} onCheckedChange={setShowTemporary} />
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <DentalChartGrid
            presence={presence}
            findings={findings}
            selectedTooth={selectedTooth}
            selectedSurfaces={selectedSurfaces}
            onToothClick={handleToothClick}
            onSurfaceClick={handleSurfaceClick}
            showTemporary={showTemporary}
          />

          {!readOnly && selectedTooth !== null && (
            <ToothEditor
              key={selectedTooth}
              toothNumber={selectedTooth}
              toothPresence={presenceMap.get(selectedTooth)}
              toothFindings={findingsMap.get(selectedTooth) ?? []}
              selectedSurfaces={selectedSurfaces}
              onToggleSurface={toggleSurface}
              onPresenceChange={handlePresenceChange}
              onAddFinding={handleAddFinding}
              onDeleteFinding={handleDeleteFinding}
              onClearTooth={handleClearTooth}
              onClose={() => {
                setSelectedTooth(null);
                setSelectedSurfaces(new Set());
              }}
            />
          )}

          <DentalChartLegend />
        </CardContent>
      </Card>

      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
        <CardHeader className="border-b border-border/40 pb-3">
          <CardTitle className="text-sm font-bold">Intraoral Examination — Screening</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <DentalChartScreening meta={meta} onChange={setMeta} disabled={readOnly} />
          {!readOnly && (
            <Button size="sm" onClick={handleSaveMeta} disabled={isSavingMeta}>
              {isSavingMeta ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save Screening Findings
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
