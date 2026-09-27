"use client";

import { useEffect, useRef, useState } from "react";
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
      id={`tooth-cell-${number}`}
      onClick={onClick}
      title={`Tooth ${number}${tooltipParts.length ? " — " + tooltipParts.join("; ") : ""}`}
      aria-label={`Tooth ${number}${tooltipParts.length ? " — " + tooltipParts.join("; ") : ""}`}
      className={cn(
        "relative flex items-center justify-center rounded-full transition-transform hover:scale-105 hover:z-10 focus-visible:outline-none shrink-0",
        small ? "h-7 w-7" : "h-10 w-10 sm:h-11 sm:w-11",
        isSelected && "ring-2 ring-cyan-500 ring-offset-2 z-10 rounded-full",
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
        <span className="absolute -bottom-1 -right-1 rounded bg-blue-600 px-1 text-[9px] font-bold text-white leading-tight shadow-sm pointer-events-none">
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
    <div className="flex gap-1 sm:gap-1.5 shrink-0">
      {numbers.map((n) => {
        const numberLabel = (
          <span key={`label-${n}`} className="text-[10px] sm:text-xs font-bold text-muted-foreground tabular-nums select-none">
            {n}
          </span>
        );
        return (
          <div key={n} className="flex flex-col items-center gap-0.5 shrink-0">
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

export function DentalChartGrid({
  presence,
  findings,
  selectedTooth,
  selectedSurfaces,
  onToothClick,
  onSurfaceClick,
  showTemporary,
}: DentalChartGridProps) {
  const presenceMap = new Map(presence.map((p) => [p.tooth_number, p.presence]));
  const findingsMap = new Map<number, ToothFinding[]>();
  for (const f of findings) {
    const existing = findingsMap.get(f.tooth_number) ?? [];
    existing.push(f);
    findingsMap.set(f.tooth_number, existing);
  }

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeSide, setActiveSide] = useState<"right" | "center" | "left">("right");

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 10) {
      setActiveSide("right");
      return;
    }
    const ratio = el.scrollLeft / maxScroll;
    if (ratio < 0.25) {
      setActiveSide("right");
    } else if (ratio > 0.75) {
      setActiveSide("left");
    } else {
      setActiveSide("center");
    }
  };

  const scrollToSide = (target: "right" | "center" | "left") => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;

    let targetLeft = 0;
    if (target === "left") {
      targetLeft = maxScroll;
    } else if (target === "center") {
      const midlineEl = document.getElementById("dental-chart-midline");
      if (midlineEl) {
        targetLeft = Math.round(midlineEl.offsetLeft + midlineEl.offsetWidth / 2 - el.clientWidth / 2);
      } else {
        targetLeft = Math.round(maxScroll / 2);
      }
    }

    el.scrollTo({ left: Math.max(0, Math.min(targetLeft, maxScroll)), behavior: "smooth" });
    setActiveSide(target);
  };

  // Center selected tooth inside scroll container on click without moving window scroll
  useEffect(() => {
    if (!selectedTooth) return;
    const toothEl = document.getElementById(`tooth-cell-${selectedTooth}`);
    const container = scrollContainerRef.current;
    if (toothEl && container) {
      const toothLeft = toothEl.offsetLeft;
      const toothWidth = toothEl.offsetWidth;
      const containerWidth = container.clientWidth;
      const targetLeft = toothLeft + toothWidth / 2 - containerWidth / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    }
  }, [selectedTooth]);

  return (
    <div className="space-y-3">
      {/* Mobile Swipe Navigation and Quadrant Switcher */}
      <div className="flex sm:hidden flex-col gap-2">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-700 dark:text-cyan-300 font-medium">
          <span>Swipe horizontally or tap buttons to inspect</span>
          <span className="font-mono text-[10px] font-bold">FDI Chart</span>
        </div>

        {/* Quick jump pills for mobile */}
        <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl text-center">
          <button
            type="button"
            onClick={() => scrollToSide("right")}
            className={cn(
              "py-1.5 px-2 text-xs font-semibold rounded-lg transition-all",
              activeSide === "right"
                ? "bg-white dark:bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Right (Q1 / Q4)
          </button>
          <button
            type="button"
            onClick={() => scrollToSide("center")}
            className={cn(
              "py-1.5 px-2 text-xs font-semibold rounded-lg transition-all",
              activeSide === "center"
                ? "bg-white dark:bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Midline
          </button>
          <button
            type="button"
            onClick={() => scrollToSide("left")}
            className={cn(
              "py-1.5 px-2 text-xs font-semibold rounded-lg transition-all",
              activeSide === "left"
                ? "bg-white dark:bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Left (Q2 / Q3)
          </button>
        </div>
      </div>

      {/* Unified Dental Arch Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="overflow-x-auto touch-pan-x overscroll-x-contain pb-2 pt-1 max-w-full scrollbar-thin scrollbar-thumb-muted-foreground/20"
      >
        <div className="inline-flex flex-col min-w-full items-center justify-start lg:justify-center gap-3">
          {/* Upper Arch (Maxillary) */}
          <div className="rounded-xl border bg-card p-3 sm:p-4 space-y-2.5 w-full min-w-max">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Right (Q1)</span>
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">Upper Arch (Maxillary)</p>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Left (Q2)</span>
            </div>

            {showTemporary && (
              <div className="pb-2 border-b border-dashed border-border/60">
                <div className="flex items-center justify-center gap-1.5 px-3">
                  <ArchRow
                    numbers={TEMPORARY_UPPER_RIGHT}
                    presenceMap={presenceMap}
                    findingsMap={findingsMap}
                    selectedTooth={selectedTooth}
                    selectedSurfaces={selectedSurfaces}
                    onToothClick={onToothClick}
                    onSurfaceClick={onSurfaceClick}
                    small
                    numberPosition="above"
                  />
                  <div className="w-px self-stretch bg-border mx-2 shrink-0" />
                  <ArchRow
                    numbers={TEMPORARY_UPPER_LEFT}
                    presenceMap={presenceMap}
                    findingsMap={findingsMap}
                    selectedTooth={selectedTooth}
                    selectedSurfaces={selectedSurfaces}
                    onToothClick={onToothClick}
                    onSurfaceClick={onSurfaceClick}
                    small
                    numberPosition="above"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 px-3 pt-1">
              {/* Q1 Upper Right (18 to 11) */}
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded mb-1 lg:hidden">
                  Q1 (Right)
                </span>
                <ArchRow
                  numbers={PERMANENT_UPPER_RIGHT}
                  presenceMap={presenceMap}
                  findingsMap={findingsMap}
                  selectedTooth={selectedTooth}
                  selectedSurfaces={selectedSurfaces}
                  onToothClick={onToothClick}
                  onSurfaceClick={onSurfaceClick}
                  numberPosition="above"
                />
              </div>

              {/* Midline Divider */}
              <div id="dental-chart-midline" className="w-px self-stretch bg-border/80 mx-2 shrink-0 flex flex-col justify-center items-center">
                <span className="text-[8px] font-mono text-muted-foreground/60 select-none">|</span>
              </div>

              {/* Q2 Upper Left (21 to 28) */}
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded mb-1 lg:hidden">
                  Q2 (Left)
                </span>
                <ArchRow
                  numbers={PERMANENT_UPPER_LEFT}
                  presenceMap={presenceMap}
                  findingsMap={findingsMap}
                  selectedTooth={selectedTooth}
                  selectedSurfaces={selectedSurfaces}
                  onToothClick={onToothClick}
                  onSurfaceClick={onSurfaceClick}
                  numberPosition="above"
                />
              </div>
            </div>
          </div>

          {/* Lower Arch (Mandibular) */}
          <div className="rounded-xl border bg-card p-3 sm:p-4 space-y-2.5 w-full min-w-max">
            <div className="flex items-center justify-center gap-1.5 px-3 pb-1">
              {/* Q4 Lower Right (48 to 41) */}
              <div className="flex flex-col items-center">
                <ArchRow
                  numbers={PERMANENT_LOWER_RIGHT}
                  presenceMap={presenceMap}
                  findingsMap={findingsMap}
                  selectedTooth={selectedTooth}
                  selectedSurfaces={selectedSurfaces}
                  onToothClick={onToothClick}
                  onSurfaceClick={onSurfaceClick}
                  numberPosition="below"
                />
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded mt-1 lg:hidden">
                  Q4 (Right)
                </span>
              </div>

              {/* Midline Divider */}
              <div className="w-px self-stretch bg-border/80 mx-2 shrink-0 flex flex-col justify-center items-center">
                <span className="text-[8px] font-mono text-muted-foreground/60 select-none">|</span>
              </div>

              {/* Q3 Lower Left (31 to 38) */}
              <div className="flex flex-col items-center">
                <ArchRow
                  numbers={PERMANENT_LOWER_LEFT}
                  presenceMap={presenceMap}
                  findingsMap={findingsMap}
                  selectedTooth={selectedTooth}
                  selectedSurfaces={selectedSurfaces}
                  onToothClick={onToothClick}
                  onSurfaceClick={onSurfaceClick}
                  numberPosition="below"
                />
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 bg-muted/50 px-1.5 py-0.5 rounded mt-1 lg:hidden">
                  Q3 (Left)
                </span>
              </div>
            </div>

            {showTemporary && (
              <div className="pt-2 border-t border-dashed border-border/60">
                <div className="flex items-center justify-center gap-1.5 px-3">
                  <ArchRow
                    numbers={TEMPORARY_LOWER_RIGHT}
                    presenceMap={presenceMap}
                    findingsMap={findingsMap}
                    selectedTooth={selectedTooth}
                    selectedSurfaces={selectedSurfaces}
                    onToothClick={onToothClick}
                    onSurfaceClick={onSurfaceClick}
                    small
                    numberPosition="below"
                  />
                  <div className="w-px self-stretch bg-border mx-2 shrink-0" />
                  <ArchRow
                    numbers={TEMPORARY_LOWER_LEFT}
                    presenceMap={presenceMap}
                    findingsMap={findingsMap}
                    selectedTooth={selectedTooth}
                    selectedSurfaces={selectedSurfaces}
                    onToothClick={onToothClick}
                    onSurfaceClick={onSurfaceClick}
                    small
                    numberPosition="below"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Right (Q4)</span>
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">Lower Arch (Mandibular)</p>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Left (Q3)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
