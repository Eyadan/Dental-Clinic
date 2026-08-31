"use client";

import { cn } from "@/lib/utils/cn";
import type { ToothPresence, ToothFinding } from "@/lib/types/database";
import type { ToothSurface } from "@/lib/types/enums";
import {
  getFindingCode,
  PERMANENT_UPPER_RIGHT,
  PERMANENT_UPPER_LEFT,
  PERMANENT_LOWER_RIGHT,
  PERMANENT_LOWER_LEFT,
  TEMPORARY_UPPER_RIGHT,
  TEMPORARY_UPPER_LEFT,
  TEMPORARY_LOWER_RIGHT,
  TEMPORARY_LOWER_LEFT,
} from "./tooth-legend";
import { ToothIcon } from "./tooth-icon";

interface DentalChartGridProps {
  presence: ToothPresence[];
  findings: ToothFinding[];
  selectedTooth: number | null;
  selectedSurfaces: Set<ToothSurface>;
  onToothClick: (toothNumber: number) => void;
  onSurfaceClick: (toothNumber: number, surface: ToothSurface) => void;
  showTemporary: boolean;
}

function ToothCell({
  number,
  toothFindings,
  toothPresence,
  isSelected,
  selectedSurfaces,
  onClick,
  onSurfaceClick,
  small,
}: {
  number: number;
  toothFindings: ToothFinding[];
  toothPresence: string | null;
  isSelected: boolean;
  selectedSurfaces: Set<ToothSurface>;
  onClick: () => void;
  onSurfaceClick: (surface: ToothSurface) => void;
  small?: boolean;
}) {
  const tooltipParts = toothFindings.map((f) => {
    const code = getFindingCode(f.category, f.code);
    return `${f.category}: ${code}`;
  });

  const hasRestoration = toothFindings.some((f) => f.category === "restoration");

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Tooth ${number}${tooltipParts.length ? " — " + tooltipParts.join("; ") : ""}`}
      aria-label={`Tooth ${number}${tooltipParts.length ? " — " + tooltipParts.join("; ") : ""}`}
      className={cn(
        "relative flex items-center justify-center rounded-full transition-all hover:scale-110 hover:z-10 focus-visible:outline-none",
        small ? "h-[30px] w-[30px]" : "h-11 w-11",
        isSelected && "ring-2 ring-cyan-500 ring-offset-1 z-10 rounded-full",
      )}
    >
      <ToothIcon
        number={number}
        findings={toothFindings}
        presence={toothPresence}
        selectedSurfaces={isSelected ? selectedSurfaces : new Set()}
        onSurfaceClick={onSurfaceClick}
        small={small}
      />
      {hasRestoration && (
        <span className="absolute -bottom-1 -right-1 rounded bg-blue-600 px-1 text-[9px] font-bold text-white leading-tight shadow-sm">
          R
        </span>
      )}
    </button>
  );
}

function ArchRow({
  numbers,
  presenceMap,
  findingsMap,
  selectedTooth,
  selectedSurfaces,
  onToothClick,
  onSurfaceClick,
  small,
  numberPosition = "above",
}: {
  numbers: number[];
  presenceMap: Map<number, string>;
  findingsMap: Map<number, ToothFinding[]>;
  selectedTooth: number | null;
  selectedSurfaces: Set<ToothSurface>;
  onToothClick: (n: number) => void;
  onSurfaceClick: (toothNumber: number, surface: ToothSurface) => void;
  small?: boolean;
  numberPosition?: "above" | "below";
}) {
  return (
    <div className="flex gap-1">
      {numbers.map((n) => {
        const numberLabel = (
          <span key={`label-${n}`} className="text-[10px] font-bold text-muted-foreground tabular-nums">
            {n}
          </span>
        );
        return (
          <div key={n} className="flex flex-col items-center gap-0.5">
            {numberPosition === "above" && numberLabel}
            <ToothCell
              number={n}
              toothFindings={findingsMap.get(n) ?? []}
              toothPresence={presenceMap.get(n) ?? null}
              isSelected={selectedTooth === n}
              selectedSurfaces={selectedSurfaces}
              onClick={() => onToothClick(n)}
              onSurfaceClick={(surface) => onSurfaceClick(n, surface)}
              small={small}
            />
            {numberPosition === "below" && numberLabel}
          </div>
        );
      })}
    </div>
  );
}

export function DentalChartGrid({ presence, findings, selectedTooth, selectedSurfaces, onToothClick, onSurfaceClick, showTemporary }: DentalChartGridProps) {
  const presenceMap = new Map(presence.map((p) => [p.tooth_number, p.presence]));
  const findingsMap = new Map<number, ToothFinding[]>();
  for (const f of findings) {
    const existing = findingsMap.get(f.tooth_number) ?? [];
    existing.push(f);
    findingsMap.set(f.tooth_number, existing);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Right</span>
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">Upper Arch (Maxillary)</p>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Left</span>
        </div>
        {showTemporary && (
          <div className="flex justify-center gap-1 pb-1 border-b border-dashed border-border/60">
            <ArchRow numbers={TEMPORARY_UPPER_RIGHT} presenceMap={presenceMap} findingsMap={findingsMap} selectedTooth={selectedTooth} selectedSurfaces={selectedSurfaces} onToothClick={onToothClick} onSurfaceClick={onSurfaceClick} small numberPosition="above" />
            <div className="w-px self-stretch bg-border mx-1" />
            <ArchRow numbers={TEMPORARY_UPPER_LEFT} presenceMap={presenceMap} findingsMap={findingsMap} selectedTooth={selectedTooth} selectedSurfaces={selectedSurfaces} onToothClick={onToothClick} onSurfaceClick={onSurfaceClick} small numberPosition="above" />
          </div>
        )}
        <div className="flex justify-center gap-1">
          <ArchRow numbers={PERMANENT_UPPER_RIGHT} presenceMap={presenceMap} findingsMap={findingsMap} selectedTooth={selectedTooth} selectedSurfaces={selectedSurfaces} onToothClick={onToothClick} onSurfaceClick={onSurfaceClick} numberPosition="above" />
          <div className="w-px self-stretch bg-border mx-1" />
          <ArchRow numbers={PERMANENT_UPPER_LEFT} presenceMap={presenceMap} findingsMap={findingsMap} selectedTooth={selectedTooth} selectedSurfaces={selectedSurfaces} onToothClick={onToothClick} onSurfaceClick={onSurfaceClick} numberPosition="above" />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2.5">
        <div className="flex justify-center gap-1">
          <ArchRow numbers={PERMANENT_LOWER_RIGHT} presenceMap={presenceMap} findingsMap={findingsMap} selectedTooth={selectedTooth} selectedSurfaces={selectedSurfaces} onToothClick={onToothClick} onSurfaceClick={onSurfaceClick} numberPosition="below" />
          <div className="w-px self-stretch bg-border mx-1" />
          <ArchRow numbers={PERMANENT_LOWER_LEFT} presenceMap={presenceMap} findingsMap={findingsMap} selectedTooth={selectedTooth} selectedSurfaces={selectedSurfaces} onToothClick={onToothClick} onSurfaceClick={onSurfaceClick} numberPosition="below" />
        </div>
        {showTemporary && (
          <div className="flex justify-center gap-1 pt-1 border-t border-dashed border-border/60">
            <ArchRow numbers={TEMPORARY_LOWER_RIGHT} presenceMap={presenceMap} findingsMap={findingsMap} selectedTooth={selectedTooth} selectedSurfaces={selectedSurfaces} onToothClick={onToothClick} onSurfaceClick={onSurfaceClick} small numberPosition="below" />
            <div className="w-px self-stretch bg-border mx-1" />
            <ArchRow numbers={TEMPORARY_LOWER_LEFT} presenceMap={presenceMap} findingsMap={findingsMap} selectedTooth={selectedTooth} selectedSurfaces={selectedSurfaces} onToothClick={onToothClick} onSurfaceClick={onSurfaceClick} small numberPosition="below" />
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Right</span>
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">Lower Arch (Mandibular)</p>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Left</span>
        </div>
      </div>
    </div>
  );
}
