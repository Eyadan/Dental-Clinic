import { z } from "zod";

// ── Presence (baseline status, single-select per tooth) ──
export const toothPresenceSchema = z.enum(["present", "missing", "impacted", "unerupted"]);

// ── Finding categories ──
export const toothFindingCategorySchema = z.enum(["condition", "restoration", "surgery"]);

// ── Condition codes (multi-select per tooth) ──
export const toothConditionSchema = z.enum([
  "decayed",
  "missing_caries",
  "missing_other_causes",
  "impacted",
  "supernumerary",
  "root_fragment",
  "unerupted",
]);

// ── Restoration codes (multi-select per tooth) ──
export const toothRestorationSchema = z.enum([
  "amalgam_filling",
  "composite_filling",
  "jacket_crown",
  "abutment",
  "attachment",
  "pontic",
  "inlay",
  "implant",
  "sealant",
  "removable_denture",
]);

// ── Surgery codes ──
export const toothSurgerySchema = z.enum(["extraction_caries", "extraction_other_causes"]);

// ── Surfaces ──
export const toothSurfaceSchema = z.enum(["mesial", "distal", "buccal", "lingual", "occlusal"]);

// ── Finding input (for creating/updating a finding) ──
export const toothFindingInputSchema = z.object({
  tooth_number: z.number().int().min(11).max(85),
  category: toothFindingCategorySchema,
  code: z.string().min(1).max(50),
  surfaces: z.array(toothSurfaceSchema).default([]),
  notes: z.string().max(500).nullable().optional(),
});

export type ToothFindingInput = z.infer<typeof toothFindingInputSchema>;

// ── Presence input ──
export const toothPresenceInputSchema = z.object({
  tooth_number: z.number().int().min(11).max(85),
  presence: toothPresenceSchema,
});

export type ToothPresenceInput = z.infer<typeof toothPresenceInputSchema>;

// ── Chart meta (screening/examination fields) ──
const booleanField = () => z.boolean().optional();
const optionalText = (max: number) => z.string().max(max).nullable().optional();

export const dentalChartMetaSchema = z.object({
  periodontal_gingivitis: booleanField(),
  periodontal_early_periodontitis: booleanField(),
  periodontal_moderate_periodontitis: booleanField(),
  periodontal_advanced_periodontitis: booleanField(),
  occlusion_class_molar: booleanField(),
  occlusion_overjet: booleanField(),
  occlusion_overbite: booleanField(),
  occlusion_midline_deviation: booleanField(),
  occlusion_crossbite: booleanField(),
  appliance_orthodontic: booleanField(),
  appliance_stayplate: booleanField(),
  appliance_others: optionalText(200),
  tmd_clenching: booleanField(),
  tmd_clicking: booleanField(),
  tmd_trismus: booleanField(),
  tmd_muscle_spasm: booleanField(),
  xray_periapical: booleanField(),
  xray_periapical_tooth_no: optionalText(50),
  xray_panoramic: booleanField(),
  xray_cephalometric: booleanField(),
  xray_occlusal: booleanField(),
  xray_others: optionalText(200),
});

export type DentalChartMetaInput = z.infer<typeof dentalChartMetaSchema>;
