"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, X, Trash2 } from "lucide-react";
import type { ToothPresence, ToothFinding } from "@/lib/types/database";
import type { ToothPresenceStatus, ToothFindingCategory, ToothSurface } from "@/lib/types/enums";
import {
  PRESENCE_LEGEND,
  CONDITION_LEGEND,
  RESTORATION_LEGEND,
  SURGERY_LEGEND,
  SURFACE_LABELS,
  getFindingCode,
  getFindingColor,
} from "./tooth-legend";

interface ToothEditorProps {
  toothNumber: number;
  toothPresence: ToothPresence | undefined;
  toothFindings: ToothFinding[];
  selectedSurfaces: Set<ToothSurface>;
  onToggleSurface: (surface: ToothSurface) => void;
  onPresenceChange: (presence: ToothPresenceStatus) => Promise<void>;
  onAddFinding: (category: ToothFindingCategory, code: string, surfaces: ToothSurface[]) => Promise<void>;
  onDeleteFinding: (findingId: string) => Promise<void>;
  onClearTooth: () => Promise<void>;
  onClose: () => void;
}

const SURFACES: ToothSurface[] = ["mesial", "distal", "buccal", "lingual", "occlusal"];
const PRESENCE_OPTIONS: ToothPresenceStatus[] = ["present", "missing", "impacted", "unerupted"];

export function ToothEditor({
  toothNumber,
  toothPresence,
  toothFindings,
  selectedSurfaces,
  onToggleSurface,
  onPresenceChange,
  onAddFinding,
  onDeleteFinding,
  onClearTooth,
  onClose,
}: ToothEditorProps) {
  const currentPresence = (toothPresence?.presence ?? "present") as ToothPresenceStatus;
  const [isSaving, setIsSaving] = useState(false);

  const handlePresenceChange = async (presence: ToothPresenceStatus) => {
    setIsSaving(true);
    try {
      await onPresenceChange(presence);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFinding = async (category: ToothFindingCategory, code: string) => {
    setIsSaving(true);
    try {
      await onAddFinding(category, code, Array.from(selectedSurfaces));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFinding = async (findingId: string) => {
    setIsSaving(true);
    try {
      await onDeleteFinding(findingId);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearTooth = async () => {
    setIsSaving(true);
    try {
      await onClearTooth();
    } finally {
      setIsSaving(false);
    }
  };

  const renderMultiSelect = (
    title: string,
    legend: Record<string, { code: string; label: string; colorClass: string }>,
    category: ToothFindingCategory,
    existingCodes: Set<string>,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-bold uppercase text-muted-foreground">{title}</Label>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(legend).map(([key, entry]) => {
          const isExisting = existingCodes.has(key);
          return (
            <button
              key={key}
              type="button"
              disabled={isSaving || isExisting}
              onClick={() => handleAddFinding(category, key)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                isExisting
                  ? `${entry.colorClass} opacity-50 cursor-not-allowed`
                  : `${entry.colorClass} hover:scale-105 hover:shadow-sm`
              }`}
            >
              {isExisting ? "✓ " : "+ "}{entry.code} · {entry.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const conditionCodes = new Set(toothFindings.filter((f) => f.category === "condition").map((f) => f.code));
  const restorationCodes = new Set(toothFindings.filter((f) => f.category === "restoration").map((f) => f.code));
  const surgeryCodes = new Set(toothFindings.filter((f) => f.category === "surgery").map((f) => f.code));

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">Tooth #{toothNumber}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Presence — single select radio */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Presence</Label>
        <div className="flex flex-wrap gap-1.5">
          {PRESENCE_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={isSaving}
              onClick={() => handlePresenceChange(p)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                currentPresence === p
                  ? `${PRESENCE_LEGEND[p].colorClass} ring-2 ring-cyan-500`
                  : "border-border text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {PRESENCE_LEGEND[p].code} · {PRESENCE_LEGEND[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* Surface multi-select for new findings */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">
          Surfaces (optional — select to apply finding to specific surfaces)
        </Label>
        <div className="grid grid-cols-5 gap-1">
          {SURFACES.map((surface) => (
            <button
              key={surface}
              type="button"
              onClick={() => onToggleSurface(surface)}
              className={`rounded-md border px-1 py-1.5 text-[10px] font-semibold transition-all ${
                selectedSurfaces.has(surface)
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-700 ring-1 ring-cyan-500"
                  : "border-border text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {SURFACE_LABELS[surface].abbr}
            </button>
          ))}
        </div>
        {selectedSurfaces.size > 0 ? (
          <p className="text-[10px] text-muted-foreground">
            Will apply to: {Array.from(selectedSurfaces).map((s) => SURFACE_LABELS[s].label).join(", ")}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground/70">
            No surfaces selected — finding will apply to the whole tooth
          </p>
        )}
      </div>

      {/* Multi-select conditions */}
      {renderMultiSelect("Conditions", CONDITION_LEGEND, "condition", conditionCodes)}

      {/* Multi-select restorations */}
      {renderMultiSelect("Restorations & Prosthetics", RESTORATION_LEGEND, "restoration", restorationCodes)}

      {/* Multi-select surgery */}
      {renderMultiSelect("Surgery", SURGERY_LEGEND, "surgery", surgeryCodes)}

      {/* Existing findings list */}
      {toothFindings.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase text-muted-foreground">Existing Findings</Label>
          <div className="space-y-1">
            {toothFindings.map((f) => {
              const code = getFindingCode(f.category, f.code);
              const colorClass = getFindingColor(f.category, f.code);
              const surfaces = f.finding_surfaces?.map((fs) => SURFACE_LABELS[fs.surface].abbr).join(", ") ?? "no surface";
              return (
                <div key={f.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-2 py-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${colorClass}`}>
                      {code}
                    </span>
                    <span className="text-[11px] text-muted-foreground capitalize">{f.category}</span>
                    <span className="text-[10px] text-muted-foreground">· {surfaces}</span>
                  </div>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleDeleteFinding(f.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear all */}
      {toothFindings.length > 0 && (
        <Button type="button" size="sm" variant="outline" onClick={handleClearTooth} disabled={isSaving}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Clear All Findings
        </Button>
      )}

      {isSaving && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving...
        </div>
      )}
    </div>
  );
}
