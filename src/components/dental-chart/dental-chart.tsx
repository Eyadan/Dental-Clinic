"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

export type ToothStatus =
  | "healthy"
  | "decayed"
  | "filled"
  | "extracted"
  | "crown"
  | "implant"
  | "root_canal"
  | "bridge";

export interface ToothData {
  number: number;
  status: ToothStatus;
  notes?: string;
}

interface DentalChartProps {
  teeth: ToothData[];
  onToothClick?: (tooth: ToothData) => void;
  readOnly?: boolean;
}

const STATUS_COLORS: Record<ToothStatus, string> = {
  healthy: "bg-white border-muted-foreground/30 text-muted-foreground",
  decayed: "bg-red-100 border-red-400 text-red-700",
  filled: "bg-blue-100 border-blue-400 text-blue-700",
  extracted: "bg-gray-200 border-gray-400 text-gray-500 line-through",
  crown: "bg-amber-100 border-amber-400 text-amber-700",
  implant: "bg-purple-100 border-purple-400 text-purple-700",
  root_canal: "bg-teal-100 border-teal-400 text-teal-700",
  bridge: "bg-indigo-100 border-indigo-400 text-indigo-700",
};

const STATUS_LABELS: Record<ToothStatus, string> = {
  healthy: "Healthy",
  decayed: "Decayed",
  filled: "Filled",
  extracted: "Extracted",
  crown: "Crown",
  implant: "Implant",
  root_canal: "Root Canal",
  bridge: "Bridge",
};

const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

export function DentalChart({ teeth, onToothClick, readOnly = false }: DentalChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  const teethMap = new Map(teeth.map((t) => [t.number, t]));

  const handleToothClick = useCallback(
    (number: number) => {
      if (readOnly) return;
      setSelectedTooth(number);
      const toothData = teethMap.get(number) ?? { number, status: "healthy" as ToothStatus };
      onToothClick?.(toothData);
    },
    [onToothClick, readOnly, teethMap],
  );

  const renderTooth = (number: number) => {
    const tooth = teethMap.get(number);
    const status = tooth?.status ?? "healthy";
    const isSelected = selectedTooth === number;

    return (
      <button
        key={number}
        type="button"
        onClick={() => handleToothClick(number)}
        disabled={readOnly}
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-lg border-2 text-sm font-medium transition-all",
          STATUS_COLORS[status],
          isSelected && "ring-2 ring-primary ring-offset-1",
          !readOnly && "cursor-pointer hover:scale-110",
          readOnly && "cursor-default",
        )}
        title={`Tooth ${number}: ${STATUS_LABELS[status]}${tooth?.notes ? ` — ${tooth.notes}` : ""}`}
        aria-label={`Tooth ${number}, ${STATUS_LABELS[status]}`}
      >
        {number}
        {status === "extracted" && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl">×</span>
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="text-center text-sm font-medium text-muted-foreground">Upper Jaw</div>
        <div className="flex justify-center gap-1">
          <div className="flex gap-1">
            {UPPER_RIGHT.map(renderTooth)}
          </div>
          <div className="w-px bg-border mx-1" />
          <div className="flex gap-1">
            {UPPER_LEFT.map(renderTooth)}
          </div>
        </div>
        <div className="flex justify-between px-8 text-xs text-muted-foreground">
          <span>Right</span>
          <span>Left</span>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex justify-between px-8 text-xs text-muted-foreground">
          <span>Right</span>
          <span>Left</span>
        </div>
        <div className="flex justify-center gap-1">
          <div className="flex gap-1">
            {LOWER_RIGHT.map(renderTooth)}
          </div>
          <div className="w-px bg-border mx-1" />
          <div className="flex gap-1">
            {LOWER_LEFT.map(renderTooth)}
          </div>
        </div>
        <div className="text-center text-sm font-medium text-muted-foreground">Lower Jaw</div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_LABELS) as ToothStatus[]).map((status) => (
          <div key={status} className="flex items-center gap-1.5 text-xs">
            <div className={cn("h-4 w-4 rounded border-2", STATUS_COLORS[status])} />
            <span className="text-muted-foreground">{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
