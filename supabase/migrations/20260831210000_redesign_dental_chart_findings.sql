-- ============================================================
-- Dental Chart Redesign: Findings-based model
-- Replaces the single-status-per-tooth model with:
--   Tooth → 1:N Findings → each Finding → N:M Surfaces
-- Plus a separate Presence baseline (Present/Missing/Impacted/Unerupted)
--
-- This allows:
--   • Condition + Restoration to coexist on the same tooth
--   • Multiple conditions per tooth (e.g. Decayed + Root Fragment)
--   • Multiple restorations per tooth (e.g. Composite + Sealant)
--   • Each finding linked to one or more surfaces
--   • Presence as a single-select baseline status
-- ============================================================

-- New enum: tooth presence (baseline status, single-select)
CREATE TYPE tooth_presence_type AS ENUM (
  'present',
  'missing',
  'impacted',
  'unerupted'
);

-- New enum: finding category
CREATE TYPE tooth_finding_category AS ENUM (
  'condition',
  'restoration',
  'surgery'
);

-- ============================================================
-- tooth_presence: one row per tooth, baseline presence status
-- ============================================================
CREATE TABLE tooth_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dental_chart_id UUID NOT NULL REFERENCES dental_charts(id) ON DELETE CASCADE,
  tooth_number SMALLINT NOT NULL CHECK (tooth_number BETWEEN 11 AND 85),
  presence tooth_presence_type NOT NULL DEFAULT 'present',
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tooth_presence UNIQUE (dental_chart_id, tooth_number)
);

CREATE INDEX idx_tooth_presence_chart ON tooth_presence (dental_chart_id);

CREATE TRIGGER trg_tooth_presence_updated_at
  BEFORE UPDATE ON tooth_presence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- tooth_findings: many findings per tooth (condition/restoration/surgery)
-- ============================================================
CREATE TABLE tooth_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dental_chart_id UUID NOT NULL REFERENCES dental_charts(id) ON DELETE CASCADE,
  tooth_number SMALLINT NOT NULL CHECK (tooth_number BETWEEN 11 AND 85),
  category tooth_finding_category NOT NULL,
  code TEXT NOT NULL,
  notes TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tooth_findings_chart ON tooth_findings (dental_chart_id);
CREATE INDEX idx_tooth_findings_tooth ON tooth_findings (dental_chart_id, tooth_number);

CREATE TRIGGER trg_tooth_findings_updated_at
  BEFORE UPDATE ON tooth_findings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Surface enum (was only TypeScript-side before, now needed as PG type)
CREATE TYPE tooth_surface AS ENUM (
  'mesial',
  'distal',
  'buccal',
  'lingual',
  'occlusal'
);

-- ============================================================
-- finding_surfaces: N:M link between findings and surfaces
-- ============================================================
CREATE TABLE finding_surfaces (
  finding_id UUID NOT NULL REFERENCES tooth_findings(id) ON DELETE CASCADE,
  surface tooth_surface NOT NULL,
  PRIMARY KEY (finding_id, surface)
);

CREATE INDEX idx_finding_surfaces_finding ON finding_surfaces (finding_id);

-- ============================================================
-- Migrate data from dental_chart_teeth → new tables
-- ============================================================
INSERT INTO tooth_presence (dental_chart_id, tooth_number, presence, updated_by)
SELECT
  dental_chart_id,
  tooth_number,
  CASE
    WHEN condition = 'present' THEN 'present'::tooth_presence_type
    WHEN condition IN ('missing_caries', 'missing_other_causes') THEN 'missing'::tooth_presence_type
    WHEN condition = 'impacted' THEN 'impacted'::tooth_presence_type
    WHEN condition = 'unerupted' THEN 'unerupted'::tooth_presence_type
    ELSE 'present'::tooth_presence_type
  END,
  updated_by
FROM dental_chart_teeth
WHERE condition IS NOT NULL
ON CONFLICT (dental_chart_id, tooth_number) DO NOTHING;

-- Migrate top-level condition (non-presence ones) as findings
INSERT INTO tooth_findings (dental_chart_id, tooth_number, category, code, notes, updated_by)
SELECT
  dental_chart_id,
  tooth_number,
  'condition'::tooth_finding_category,
  condition::text,
  notes,
  updated_by
FROM dental_chart_teeth
WHERE condition IS NOT NULL
  AND condition NOT IN ('present', 'impacted', 'unerupted');

-- Migrate top-level restoration as findings
INSERT INTO tooth_findings (dental_chart_id, tooth_number, category, code, updated_by)
SELECT
  dental_chart_id,
  tooth_number,
  'restoration'::tooth_finding_category,
  restoration::text,
  updated_by
FROM dental_chart_teeth
WHERE restoration IS NOT NULL;

-- Migrate top-level surgery as findings
INSERT INTO tooth_findings (dental_chart_id, tooth_number, category, code, updated_by)
SELECT
  dental_chart_id,
  tooth_number,
  'surgery'::tooth_finding_category,
  surgery::text,
  updated_by
FROM dental_chart_teeth
WHERE surgery IS NOT NULL;

-- Migrate surface_findings JSONB → individual findings + surfaces
-- Each surface entry had { condition, restoration, surgery, notes }
-- We create a finding per non-null field and link it to the surface.
DO $$
DECLARE
  row RECORD;
  surface_key TEXT;
  surface_val JSONB;
  finding_id UUID;
BEGIN
  FOR row IN SELECT id, dental_chart_id, tooth_number, surface_findings FROM dental_chart_teeth WHERE surface_findings IS NOT NULL
  LOOP
    FOR surface_key, surface_val IN SELECT * FROM jsonb_each_text(row.surface_findings)
    LOOP
      -- surface_val is a JSON string like {"condition":"decayed","restoration":null,...}
      -- Parse it
      BEGIN
        IF surface_val::jsonb->>'condition' IS NOT NULL THEN
          INSERT INTO tooth_findings (dental_chart_id, tooth_number, category, code)
          VALUES (row.dental_chart_id, row.tooth_number, 'condition', surface_val::jsonb->>'condition')
          RETURNING id INTO finding_id;
          INSERT INTO finding_surfaces (finding_id, surface) VALUES (finding_id, surface_key);
        END IF;
        IF surface_val::jsonb->>'restoration' IS NOT NULL THEN
          INSERT INTO tooth_findings (dental_chart_id, tooth_number, category, code)
          VALUES (row.dental_chart_id, row.tooth_number, 'restoration', surface_val::jsonb->>'restoration')
          RETURNING id INTO finding_id;
          INSERT INTO finding_surfaces (finding_id, surface) VALUES (finding_id, surface_key);
        END IF;
        IF surface_val::jsonb->>'surgery' IS NOT NULL THEN
          INSERT INTO tooth_findings (dental_chart_id, tooth_number, category, code)
          VALUES (row.dental_chart_id, row.tooth_number, 'surgery', surface_val::jsonb->>'surgery')
          RETURNING id INTO finding_id;
          INSERT INTO finding_surfaces (finding_id, surface) VALUES (finding_id, surface_key);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Skip invalid surface data
        NULL;
      END;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- Drop old table and enums
-- ============================================================
DROP TABLE IF EXISTS dental_chart_teeth;
DROP TYPE IF EXISTS tooth_condition;
DROP TYPE IF EXISTS tooth_restoration;
DROP TYPE IF EXISTS tooth_surgery;

-- ============================================================
-- RLS for new tables
-- ============================================================
ALTER TABLE tooth_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE tooth_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_surfaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY tooth_presence_select ON tooth_presence
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

CREATE POLICY tooth_presence_insert ON tooth_presence
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY tooth_presence_update ON tooth_presence
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY tooth_presence_delete ON tooth_presence
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY tooth_findings_select ON tooth_findings
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

CREATE POLICY tooth_findings_insert ON tooth_findings
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY tooth_findings_update ON tooth_findings
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'))
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY tooth_findings_delete ON tooth_findings
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY finding_surfaces_select ON finding_surfaces
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

CREATE POLICY finding_surfaces_insert ON finding_surfaces
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY finding_surfaces_delete ON finding_surfaces
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'dentist'));
