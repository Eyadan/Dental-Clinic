import type { ToothCondition, ToothRestoration, ToothSurgery, ToothSurface, ToothPresenceStatus } from "@/lib/types/enums";

export interface LegendEntry {
  code: string;
  label: string;
  colorClass: string;
}

export const PRESENCE_LEGEND: Record<ToothPresenceStatus, LegendEntry> = {
  present: { code: "✓", label: "Present", colorClass: "bg-white border-slate-300 text-slate-600" },
  missing: { code: "M", label: "Missing", colorClass: "bg-slate-200 border-slate-400 text-slate-500" },
  impacted: { code: "Im", label: "Impacted", colorClass: "bg-purple-100 border-purple-400 text-purple-700" },
  unerupted: { code: "Un", label: "Unerupted", colorClass: "bg-cyan-100 border-cyan-400 text-cyan-700" },
};

export const CONDITION_LEGEND: Record<ToothCondition, LegendEntry> = {
  decayed: { code: "D", label: "Decayed (Caries)", colorClass: "bg-red-100 border-red-400 text-red-700" },
  missing_caries: { code: "M", label: "Missing due to Caries", colorClass: "bg-slate-200 border-slate-400 text-slate-500" },
  missing_other_causes: { code: "MO", label: "Missing due to Other Causes", colorClass: "bg-slate-200 border-slate-400 text-slate-500" },
  impacted: { code: "Im", label: "Impacted Tooth", colorClass: "bg-purple-100 border-purple-400 text-purple-700" },
  supernumerary: { code: "Sp", label: "Supernumerary Tooth", colorClass: "bg-indigo-100 border-indigo-400 text-indigo-700" },
  root_fragment: { code: "Rf", label: "Root Fragment", colorClass: "bg-orange-100 border-orange-400 text-orange-700" },
  unerupted: { code: "Un", label: "Unerupted", colorClass: "bg-cyan-100 border-cyan-400 text-cyan-700" },
};

export const RESTORATION_LEGEND: Record<ToothRestoration, LegendEntry> = {
  amalgam_filling: { code: "Am", label: "Amalgam Filling", colorClass: "bg-blue-100 border-blue-400 text-blue-700" },
  composite_filling: { code: "Co", label: "Composite Filling", colorClass: "bg-teal-100 border-teal-400 text-teal-700" },
  jacket_crown: { code: "JC", label: "Jacket Crown", colorClass: "bg-amber-100 border-amber-400 text-amber-700" },
  abutment: { code: "Ab", label: "Abutment", colorClass: "bg-lime-100 border-lime-400 text-lime-700" },
  attachment: { code: "Att", label: "Attachment", colorClass: "bg-emerald-100 border-emerald-400 text-emerald-700" },
  pontic: { code: "P", label: "Pontic", colorClass: "bg-fuchsia-100 border-fuchsia-400 text-fuchsia-700" },
  inlay: { code: "In", label: "Inlay", colorClass: "bg-sky-100 border-sky-400 text-sky-700" },
  implant: { code: "Imp", label: "Implant", colorClass: "bg-violet-100 border-violet-400 text-violet-700" },
  sealant: { code: "S", label: "Sealants", colorClass: "bg-green-100 border-green-400 text-green-700" },
  removable_denture: { code: "Rm", label: "Removable Denture", colorClass: "bg-rose-100 border-rose-400 text-rose-700" },
};

export const SURGERY_LEGEND: Record<ToothSurgery, LegendEntry> = {
  extraction_caries: { code: "X", label: "Extraction due to Caries", colorClass: "bg-red-600 border-red-700 text-white" },
  extraction_other_causes: { code: "XO", label: "Extraction due to Other Causes", colorClass: "bg-slate-700 border-slate-800 text-white" },
};

export const SURFACE_LABELS: Record<ToothSurface, { label: string; abbr: string }> = {
  mesial: { label: "Mesial", abbr: "M" },
  distal: { label: "Distal", abbr: "D" },
  buccal: { label: "Buccal", abbr: "B" },
  lingual: { label: "Lingual/Palatal", abbr: "L" },
  occlusal: { label: "Occlusal", abbr: "O" },
};

export type SurfaceStatus = { condition?: ToothCondition; restoration?: ToothRestoration; surgery?: ToothSurgery; notes?: string | null };

export function getFindingCode(category: "condition" | "restoration" | "surgery", code: string): string {
  if (category === "condition") {
    const entry = (CONDITION_LEGEND as Record<string, LegendEntry>)[code];
    return entry?.code ?? "";
  }
  if (category === "restoration") {
    const entry = (RESTORATION_LEGEND as Record<string, LegendEntry>)[code];
    return entry?.code ?? "";
  }
  if (category === "surgery") {
    const entry = (SURGERY_LEGEND as Record<string, LegendEntry>)[code];
    return entry?.code ?? "";
  }
  return "";
}

export function getFindingColor(category: "condition" | "restoration" | "surgery", code: string, fallback = "bg-white border-slate-200 text-slate-400"): string {
  if (category === "condition") {
    const entry = (CONDITION_LEGEND as Record<string, LegendEntry>)[code];
    return entry?.colorClass ?? fallback;
  }
  if (category === "restoration") {
    const entry = (RESTORATION_LEGEND as Record<string, LegendEntry>)[code];
    return entry?.colorClass ?? fallback;
  }
  if (category === "surgery") {
    const entry = (SURGERY_LEGEND as Record<string, LegendEntry>)[code];
    return entry?.colorClass ?? fallback;
  }
  return fallback;
}

export function getPresenceColor(presence: ToothPresenceStatus): string {
  return PRESENCE_LEGEND[presence]?.colorClass ?? "bg-white border-slate-200 text-slate-400";
}

export function getPresenceCode(presence: ToothPresenceStatus): string {
  return PRESENCE_LEGEND[presence]?.code ?? "";
}

export const PERMANENT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
export const PERMANENT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
export const PERMANENT_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
export const PERMANENT_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

export const TEMPORARY_UPPER_RIGHT = [55, 54, 53, 52, 51];
export const TEMPORARY_UPPER_LEFT = [61, 62, 63, 64, 65];
export const TEMPORARY_LOWER_RIGHT = [85, 84, 83, 82, 81];
export const TEMPORARY_LOWER_LEFT = [71, 72, 73, 74, 75];
