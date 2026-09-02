-- ============================================================
-- Dental Chart History & Snapshots
--
-- Part 1: dental_chart_history — field-level audit trail
--   Logs every INSERT/UPDATE/DELETE on tooth_presence and
--   tooth_findings, and every UPDATE on dental_charts meta.
--   Follows the same pattern as appointment_history.
--
-- Part 2: dental_chart_snapshots — full chart state per visit
--   Stores a JSONB snapshot of the entire chart (meta + presence
--   + findings + surfaces) at a point in time, linked to an
--   appointment.  Dentists can compare snapshots across visits.
--
-- Principles:
--   SOLID — each trigger function has a single responsibility
--   DRY   — shared audit helper, same pattern as appointment_history
--   KISS  — JSONB snapshot (no over-normalized snapshot detail tables)
--   ACID  — triggers fire within the same transaction as the DML
--   3NF   — audit table has no transitive dependencies;
--           snapshot JSONB is intentionally denormalized (frozen copy)
-- ============================================================

-- ============================================================
-- PART 1: dental_chart_history (Audit Log)
-- ============================================================

CREATE TABLE dental_chart_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dental_chart_id UUID NOT NULL REFERENCES dental_charts(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('chart_meta', 'tooth_presence', 'tooth_finding')),
  entity_id UUID,
  tooth_number SMALLINT,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dental_chart_history_chart ON dental_chart_history (dental_chart_id);
CREATE INDEX idx_dental_chart_history_changed_at ON dental_chart_history (changed_at DESC);

-- ── Helper: resolve changed_by UUID (null → fallback to admin) ──
CREATE OR REPLACE FUNCTION resolve_changed_by()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed_by UUID;
BEGIN
  v_changed_by := COALESCE(auth.uid(), (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1));

  IF v_changed_by IS NULL THEN
    SELECT id INTO v_changed_by FROM users LIMIT 1;
  END IF;

  RETURN v_changed_by;
END;
$$;

-- ── Trigger: dental_charts (meta fields) ──
CREATE OR REPLACE FUNCTION log_dental_chart_meta_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_by_uuid UUID;
  field_name TEXT;
BEGIN
  changed_by_uuid := resolve_changed_by();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, field, new_value)
    VALUES
      (NEW.id, changed_by_uuid, 'insert', 'chart_meta', NEW.id, 'created', NEW.patient_id::TEXT);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value)
    VALUES
      (OLD.id, changed_by_uuid, 'delete', 'chart_meta', OLD.id, 'deleted', OLD.patient_id::TEXT);
    RETURN OLD;
  END IF;

  -- UPDATE: log each changed boolean/text field
  IF NEW.periodontal_gingivitis IS DISTINCT FROM OLD.periodontal_gingivitis THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'periodontal_gingivitis', OLD.periodontal_gingivitis::TEXT, NEW.periodontal_gingivitis::TEXT);
  END IF;
  IF NEW.periodontal_early_periodontitis IS DISTINCT FROM OLD.periodontal_early_periodontitis THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'periodontal_early_periodontitis', OLD.periodontal_early_periodontitis::TEXT, NEW.periodontal_early_periodontitis::TEXT);
  END IF;
  IF NEW.periodontal_moderate_periodontitis IS DISTINCT FROM OLD.periodontal_moderate_periodontitis THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'periodontal_moderate_periodontitis', OLD.periodontal_moderate_periodontitis::TEXT, NEW.periodontal_moderate_periodontitis::TEXT);
  END IF;
  IF NEW.periodontal_advanced_periodontitis IS DISTINCT FROM OLD.periodontal_advanced_periodontitis THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'periodontal_advanced_periodontitis', OLD.periodontal_advanced_periodontitis::TEXT, NEW.periodontal_advanced_periodontitis::TEXT);
  END IF;
  IF NEW.occlusion_class_molar IS DISTINCT FROM OLD.occlusion_class_molar THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'occlusion_class_molar', OLD.occlusion_class_molar::TEXT, NEW.occlusion_class_molar::TEXT);
  END IF;
  IF NEW.occlusion_overjet IS DISTINCT FROM OLD.occlusion_overjet THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'occlusion_overjet', OLD.occlusion_overjet::TEXT, NEW.occlusion_overjet::TEXT);
  END IF;
  IF NEW.occlusion_overbite IS DISTINCT FROM OLD.occlusion_overbite THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'occlusion_overbite', OLD.occlusion_overbite::TEXT, NEW.occlusion_overbite::TEXT);
  END IF;
  IF NEW.occlusion_midline_deviation IS DISTINCT FROM OLD.occlusion_midline_deviation THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'occlusion_midline_deviation', OLD.occlusion_midline_deviation::TEXT, NEW.occlusion_midline_deviation::TEXT);
  END IF;
  IF NEW.occlusion_crossbite IS DISTINCT FROM OLD.occlusion_crossbite THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'occlusion_crossbite', OLD.occlusion_crossbite::TEXT, NEW.occlusion_crossbite::TEXT);
  END IF;
  IF NEW.appliance_orthodontic IS DISTINCT FROM OLD.appliance_orthodontic THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'appliance_orthodontic', OLD.appliance_orthodontic::TEXT, NEW.appliance_orthodontic::TEXT);
  END IF;
  IF NEW.appliance_stayplate IS DISTINCT FROM OLD.appliance_stayplate THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'appliance_stayplate', OLD.appliance_stayplate::TEXT, NEW.appliance_stayplate::TEXT);
  END IF;
  IF NEW.appliance_others IS DISTINCT FROM OLD.appliance_others THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'appliance_others', OLD.appliance_others, NEW.appliance_others);
  END IF;
  IF NEW.tmd_clenching IS DISTINCT FROM OLD.tmd_clenching THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'tmd_clenching', OLD.tmd_clenching::TEXT, NEW.tmd_clenching::TEXT);
  END IF;
  IF NEW.tmd_clicking IS DISTINCT FROM OLD.tmd_clicking THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'tmd_clicking', OLD.tmd_clicking::TEXT, NEW.tmd_clicking::TEXT);
  END IF;
  IF NEW.tmd_trismus IS DISTINCT FROM OLD.tmd_trismus THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'tmd_trismus', OLD.tmd_trismus::TEXT, NEW.tmd_trismus::TEXT);
  END IF;
  IF NEW.tmd_muscle_spasm IS DISTINCT FROM OLD.tmd_muscle_spasm THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'tmd_muscle_spasm', OLD.tmd_muscle_spasm::TEXT, NEW.tmd_muscle_spasm::TEXT);
  END IF;
  IF NEW.xray_periapical IS DISTINCT FROM OLD.xray_periapical THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'xray_periapical', OLD.xray_periapical::TEXT, NEW.xray_periapical::TEXT);
  END IF;
  IF NEW.xray_periapical_tooth_no IS DISTINCT FROM OLD.xray_periapical_tooth_no THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'xray_periapical_tooth_no', OLD.xray_periapical_tooth_no, NEW.xray_periapical_tooth_no);
  END IF;
  IF NEW.xray_panoramic IS DISTINCT FROM OLD.xray_panoramic THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'xray_panoramic', OLD.xray_panoramic::TEXT, NEW.xray_panoramic::TEXT);
  END IF;
  IF NEW.xray_cephalometric IS DISTINCT FROM OLD.xray_cephalometric THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'xray_cephalometric', OLD.xray_cephalometric::TEXT, NEW.xray_cephalometric::TEXT);
  END IF;
  IF NEW.xray_occlusal IS DISTINCT FROM OLD.xray_occlusal THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'xray_occlusal', OLD.xray_occlusal::TEXT, NEW.xray_occlusal::TEXT);
  END IF;
  IF NEW.xray_others IS DISTINCT FROM OLD.xray_others THEN
    INSERT INTO dental_chart_history (dental_chart_id, changed_by, action, entity_type, entity_id, field, old_value, new_value)
    VALUES (NEW.id, changed_by_uuid, 'update', 'chart_meta', NEW.id, 'xray_others', OLD.xray_others, NEW.xray_others);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dental_chart_meta_history_insert
  AFTER INSERT ON dental_charts
  FOR EACH ROW EXECUTE FUNCTION log_dental_chart_meta_history();

CREATE TRIGGER trg_dental_chart_meta_history_update
  AFTER UPDATE ON dental_charts
  FOR EACH ROW EXECUTE FUNCTION log_dental_chart_meta_history();

-- No AFTER DELETE trigger on dental_charts: CASCADE cleans up history rows.
-- Chart deletion is rare (patients are archived, not deleted).

-- ── Trigger: tooth_presence ──
CREATE OR REPLACE FUNCTION log_tooth_presence_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_by_uuid UUID;
BEGIN
  changed_by_uuid := resolve_changed_by();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, new_value)
    VALUES
      (NEW.dental_chart_id, changed_by_uuid, 'insert', 'tooth_presence', NEW.id, NEW.tooth_number, 'presence', NEW.presence::TEXT);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, old_value)
    VALUES
      (OLD.dental_chart_id, changed_by_uuid, 'delete', 'tooth_presence', OLD.id, OLD.tooth_number, 'presence', OLD.presence::TEXT);
    RETURN OLD;
  END IF;

  -- UPDATE
  IF NEW.presence IS DISTINCT FROM OLD.presence THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, old_value, new_value)
    VALUES
      (NEW.dental_chart_id, changed_by_uuid, 'update', 'tooth_presence', NEW.id, NEW.tooth_number, 'presence', OLD.presence::TEXT, NEW.presence::TEXT);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tooth_presence_history_insert
  AFTER INSERT ON tooth_presence
  FOR EACH ROW EXECUTE FUNCTION log_tooth_presence_history();

CREATE TRIGGER trg_tooth_presence_history_update
  AFTER UPDATE ON tooth_presence
  FOR EACH ROW EXECUTE FUNCTION log_tooth_presence_history();

CREATE TRIGGER trg_tooth_presence_history_delete
  AFTER DELETE ON tooth_presence
  FOR EACH ROW EXECUTE FUNCTION log_tooth_presence_history();

-- ── Trigger: tooth_findings ──
CREATE OR REPLACE FUNCTION log_tooth_findings_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_by_uuid UUID;
BEGIN
  changed_by_uuid := resolve_changed_by();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, new_value)
    VALUES
      (NEW.dental_chart_id, changed_by_uuid, 'insert', 'tooth_finding', NEW.id, NEW.tooth_number, 'code', NEW.code);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, old_value)
    VALUES
      (OLD.dental_chart_id, changed_by_uuid, 'delete', 'tooth_finding', OLD.id, OLD.tooth_number, 'code', OLD.code);
    RETURN OLD;
  END IF;

  -- UPDATE: log code, category, notes changes
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, old_value, new_value)
    VALUES
      (NEW.dental_chart_id, changed_by_uuid, 'update', 'tooth_finding', NEW.id, NEW.tooth_number, 'code', OLD.code, NEW.code);
  END IF;
  IF NEW.category IS DISTINCT FROM OLD.category THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, old_value, new_value)
    VALUES
      (NEW.dental_chart_id, changed_by_uuid, 'update', 'tooth_finding', NEW.id, NEW.tooth_number, 'category', OLD.category::TEXT, NEW.category::TEXT);
  END IF;
  IF NEW.notes IS DISTINCT FROM OLD.notes THEN
    INSERT INTO dental_chart_history
      (dental_chart_id, changed_by, action, entity_type, entity_id, tooth_number, field, old_value, new_value)
    VALUES
      (NEW.dental_chart_id, changed_by_uuid, 'update', 'tooth_finding', NEW.id, NEW.tooth_number, 'notes', OLD.notes, NEW.notes);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tooth_findings_history_insert
  AFTER INSERT ON tooth_findings
  FOR EACH ROW EXECUTE FUNCTION log_tooth_findings_history();

CREATE TRIGGER trg_tooth_findings_history_update
  AFTER UPDATE ON tooth_findings
  FOR EACH ROW EXECUTE FUNCTION log_tooth_findings_history();

CREATE TRIGGER trg_tooth_findings_history_delete
  AFTER DELETE ON tooth_findings
  FOR EACH ROW EXECUTE FUNCTION log_tooth_findings_history();

-- ============================================================
-- PART 2: dental_chart_snapshots (Visit-based)
-- ============================================================

CREATE TABLE dental_chart_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dental_chart_id UUID NOT NULL REFERENCES dental_charts(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_chart_appointment_snapshot UNIQUE (dental_chart_id, appointment_id)
);

CREATE INDEX idx_dental_chart_snapshots_chart ON dental_chart_snapshots (dental_chart_id);
CREATE INDEX idx_dental_chart_snapshots_appointment ON dental_chart_snapshots (appointment_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE dental_chart_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_chart_snapshots ENABLE ROW LEVEL SECURITY;

-- dental_chart_history: INSERT only (immutable audit trail)
CREATE POLICY dental_chart_history_select ON dental_chart_history
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

CREATE POLICY dental_chart_history_insert ON dental_chart_history
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

-- No UPDATE or DELETE policies — immutable by design

-- dental_chart_snapshots: dentist/admin can create, all staff can read
CREATE POLICY dental_chart_snapshots_select ON dental_chart_snapshots
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

CREATE POLICY dental_chart_snapshots_insert ON dental_chart_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY dental_chart_snapshots_delete ON dental_chart_snapshots
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin'));
