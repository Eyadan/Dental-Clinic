-- ============================================================
-- PDA Dental Record Chart (page 3) — Intraoral Examination
-- Persistent per-patient chart: one row per tooth (FDI notation,
-- permanent 11-48 + temporary 51-85) with condition/restoration/
-- surgery status mirroring the PDA legend, plus periodontal
-- screening, occlusion, appliances, TMD, and x-ray sections.
-- 3NF: chart-level fields in dental_charts, per-tooth findings
-- normalised into dental_chart_teeth.
-- ============================================================

CREATE TYPE tooth_condition AS ENUM (
  'present',
  'decayed',
  'missing_caries',
  'missing_other_causes',
  'impacted',
  'supernumerary',
  'root_fragment',
  'unerupted'
);

CREATE TYPE tooth_restoration AS ENUM (
  'amalgam_filling',
  'composite_filling',
  'jacket_crown',
  'abutment',
  'attachment',
  'pontic',
  'inlay',
  'implant',
  'sealant',
  'removable_denture'
);

CREATE TYPE tooth_surgery AS ENUM (
  'extraction_caries',
  'extraction_other_causes'
);

CREATE TABLE dental_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,

  -- Periodontal Screening
  periodontal_gingivitis BOOLEAN NOT NULL DEFAULT false,
  periodontal_early_periodontitis BOOLEAN NOT NULL DEFAULT false,
  periodontal_moderate_periodontitis BOOLEAN NOT NULL DEFAULT false,
  periodontal_advanced_periodontitis BOOLEAN NOT NULL DEFAULT false,

  -- Occlusion
  occlusion_class_molar BOOLEAN NOT NULL DEFAULT false,
  occlusion_overjet BOOLEAN NOT NULL DEFAULT false,
  occlusion_overbite BOOLEAN NOT NULL DEFAULT false,
  occlusion_midline_deviation BOOLEAN NOT NULL DEFAULT false,
  occlusion_crossbite BOOLEAN NOT NULL DEFAULT false,

  -- Appliances
  appliance_orthodontic BOOLEAN NOT NULL DEFAULT false,
  appliance_stayplate BOOLEAN NOT NULL DEFAULT false,
  appliance_others TEXT,

  -- TMD
  tmd_clenching BOOLEAN NOT NULL DEFAULT false,
  tmd_clicking BOOLEAN NOT NULL DEFAULT false,
  tmd_trismus BOOLEAN NOT NULL DEFAULT false,
  tmd_muscle_spasm BOOLEAN NOT NULL DEFAULT false,

  -- X-ray Taken
  xray_periapical BOOLEAN NOT NULL DEFAULT false,
  xray_periapical_tooth_no TEXT,
  xray_panoramic BOOLEAN NOT NULL DEFAULT false,
  xray_cephalometric BOOLEAN NOT NULL DEFAULT false,
  xray_occlusal BOOLEAN NOT NULL DEFAULT false,
  xray_others TEXT,

  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dental_chart_teeth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dental_chart_id UUID NOT NULL REFERENCES dental_charts(id) ON DELETE CASCADE,
  tooth_number SMALLINT NOT NULL CHECK (
    tooth_number BETWEEN 11 AND 85
  ),
  condition tooth_condition,
  restoration tooth_restoration,
  surgery tooth_surgery,
  notes TEXT,
  surface_findings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_dental_chart_tooth UNIQUE (dental_chart_id, tooth_number)
);

CREATE INDEX idx_dental_chart_teeth_chart ON dental_chart_teeth (dental_chart_id);

CREATE TRIGGER trg_dental_charts_updated_at
  BEFORE UPDATE ON dental_charts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_dental_chart_teeth_updated_at
  BEFORE UPDATE ON dental_chart_teeth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE dental_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_chart_teeth ENABLE ROW LEVEL SECURITY;

CREATE POLICY dental_charts_select ON dental_charts
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

CREATE POLICY dental_charts_insert ON dental_charts
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY dental_charts_update ON dental_charts
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY dental_chart_teeth_select ON dental_chart_teeth
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

CREATE POLICY dental_chart_teeth_insert ON dental_chart_teeth
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY dental_chart_teeth_update ON dental_chart_teeth
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY dental_chart_teeth_delete ON dental_chart_teeth
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'));
