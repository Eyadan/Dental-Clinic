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
        <p className="text-sm font-bold text-foreground">Tooth #{toothNumber} Clinical Findings</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-9 w-9 p-0 rounded-xl hover:bg-muted"
          aria-label="Close tooth editor"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Presence — single select radio */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Tooth Presence Status</Label>
        <div className="flex flex-wrap gap-2">
          {PRESENCE_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={isSaving}
              onClick={() => handlePresenceChange(p)}
              className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                currentPresence === p
                  ? `${PRESENCE_LEGEND[p].colorClass} ring-2 ring-cyan-500 font-bold shadow-xs`
                  : "border-border text-muted-foreground hover:bg-muted/40"
              }`}
              style={{ minHeight: "40px" }}
            >
              {PRESENCE_LEGEND[p].code} · {PRESENCE_LEGEND[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* Surface multi-select for new findings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-bold uppercase text-muted-foreground">
            Surfaces (tap diagram or buttons below)
          </Label>
          {selectedSurfaces.size > 0 && (
            <button
              type="button"
              onClick={() => {
                for (const s of Array.from(selectedSurfaces)) {
                  onToggleSurface(s);
                }
              }}
              className="text-[11px] font-semibold text-cyan-600 hover:text-cyan-700 underline"
            >
              Clear Selection
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-3 rounded-2xl border border-border/80">
          {/* Interactive Zoomed Tooth Diagram for Tablet & Mobile */}
          <div className="relative shrink-0 flex items-center justify-center p-1 bg-muted/30 rounded-2xl border border-border/50">
            <svg
              width={96}
              height={96}
              viewBox="0 0 96 96"
              className="overflow-visible select-none"
              style={{ touchAction: "manipulation" }}
            >
              {/* Outer boundary */}
              <circle cx={48} cy={48} r={42} fill="white" stroke="#94a3b8" strokeWidth={1.5} className="dark:fill-slate-900 dark:stroke-slate-700" />
              
              {/* Buccal (Top) */}
              <path
                d="M 48 48 L 6 48 A 42 42 0 0 1 48 6 Z"
                fill={selectedSurfaces.has("buccal") ? "#38bdf8" : "#f1f5f9"}
                stroke={selectedSurfaces.has("buccal") ? "#0284c7" : "#cbd5e1"}
                strokeWidth={selectedSurfaces.has("buccal") ? 2.5 : 1}
                className="cursor-pointer transition-colors dark:fill-slate-800 dark:stroke-slate-700 hover:opacity-90"
                onClick={() => onToggleSurface("buccal")}
              />
              <text
                x={48}
                y={26}
                textAnchor="middle"
                fontSize={10}
                fontWeight="bold"
                fill={selectedSurfaces.has("buccal") ? "#0369a1" : "#64748b"}
                className="pointer-events-none select-none font-bold"
              >
                B
              </text>

              {/* Distal (Right) */}
              <path
                d="M 48 48 L 48 6 A 42 42 0 0 1 90 48 Z"
                fill={selectedSurfaces.has("distal") ? "#38bdf8" : "#f1f5f9"}
                stroke={selectedSurfaces.has("distal") ? "#0284c7" : "#cbd5e1"}
                strokeWidth={selectedSurfaces.has("distal") ? 2.5 : 1}
                className="cursor-pointer transition-colors dark:fill-slate-800 dark:stroke-slate-700 hover:opacity-90"
                onClick={() => onToggleSurface("distal")}
              />
              <text
                x={70}
                y={48}
                textAnchor="middle"
                fontSize={10}
                fontWeight="bold"
                fill={selectedSurfaces.has("distal") ? "#0369a1" : "#64748b"}
                className="pointer-events-none select-none font-bold"
              >
                D
              </text>

              {/* Lingual (Bottom) */}
              <path
                d="M 48 48 L 90 48 A 42 42 0 0 1 48 90 Z"
                fill={selectedSurfaces.has("lingual") ? "#38bdf8" : "#f1f5f9"}
                stroke={selectedSurfaces.has("lingual") ? "#0284c7" : "#cbd5e1"}
                strokeWidth={selectedSurfaces.has("lingual") ? 2.5 : 1}
                className="cursor-pointer transition-colors dark:fill-slate-800 dark:stroke-slate-700 hover:opacity-90"
                onClick={() => onToggleSurface("lingual")}
              />
              <text
                x={48}
                y={72}
                textAnchor="middle"
                fontSize={10}
                fontWeight="bold"
                fill={selectedSurfaces.has("lingual") ? "#0369a1" : "#64748b"}
                className="pointer-events-none select-none font-bold"
              >
                L
              </text>

              {/* Mesial (Left) */}
              <path
                d="M 48 48 L 48 90 A 42 42 0 0 1 6 48 Z"
                fill={selectedSurfaces.has("mesial") ? "#38bdf8" : "#f1f5f9"}
                stroke={selectedSurfaces.has("mesial") ? "#0284c7" : "#cbd5e1"}
                strokeWidth={selectedSurfaces.has("mesial") ? 2.5 : 1}
                className="cursor-pointer transition-colors dark:fill-slate-800 dark:stroke-slate-700 hover:opacity-90"
                onClick={() => onToggleSurface("mesial")}
              />
              <text
                x={26}
                y={48}
                textAnchor="middle"
                fontSize={10}
                fontWeight="bold"
                fill={selectedSurfaces.has("mesial") ? "#0369a1" : "#64748b"}
                className="pointer-events-none select-none font-bold"
              >
                M
              </text>

              {/* Occlusal (Center Circle) */}
              <circle
                cx={48}
                cy={48}
                r={18}
                fill={selectedSurfaces.has("occlusal") ? "#38bdf8" : "#ffffff"}
                stroke={selectedSurfaces.has("occlusal") ? "#0284c7" : "#94a3b8"}
                strokeWidth={selectedSurfaces.has("occlusal") ? 2.5 : 1.5}
                className="cursor-pointer transition-colors dark:fill-slate-900 dark:stroke-slate-600 hover:opacity-90"
                onClick={() => onToggleSurface("occlusal")}
              />
              <text
                x={48}
                y={51}
                textAnchor="middle"
                fontSize={10}
                fontWeight="bold"
                fill={selectedSurfaces.has("occlusal") ? "#0369a1" : "#334155"}
                className="pointer-events-none select-none font-bold"
              >
                O
              </text>
            </svg>
          </div>

          {/* Quick Buttons for Tablet / Mobile */}
          <div className="grid grid-cols-5 gap-1.5 flex-1 w-full">
            {SURFACES.map((surface) => (
              <button
                key={surface}
                type="button"
                onClick={() => onToggleSurface(surface)}
                className={`rounded-xl border px-2 py-2 text-xs font-bold transition-all flex flex-col items-center justify-center ${
                  selectedSurfaces.has(surface)
                    ? "border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 ring-2 ring-cyan-500 shadow-xs"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
                style={{ minHeight: "44px" }}
              >
                <span className="font-extrabold">{SURFACE_LABELS[surface].abbr}</span>
                <span className="text-[9px] font-normal text-muted-foreground">{SURFACE_LABELS[surface].label}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedSurfaces.size > 0 ? (
          <p className="text-[10px] text-cyan-700 dark:text-cyan-300 font-semibold">
            Selected surfaces: {Array.from(selectedSurfaces).map((s) => SURFACE_LABELS[s].label).join(", ")}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground/70">
            No specific surface selected — finding will apply to the whole tooth
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
