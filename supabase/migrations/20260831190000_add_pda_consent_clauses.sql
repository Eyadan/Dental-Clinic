-- ============================================================
-- PDA Dental Chart — Informed Consent clauses (page 2)
-- Dentist selects applicable clauses per consent form; patient
-- initials each selected clause during signing.
-- 3NF: clauses normalised into lookup table + per-form junction.
-- ============================================================

CREATE TABLE IF NOT EXISTS consent_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consent_form_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_form_id UUID NOT NULL REFERENCES consent_forms(id) ON DELETE CASCADE,
  clause_id UUID NOT NULL REFERENCES consent_clauses(id) ON DELETE RESTRICT,
  patient_initials TEXT,
  initialed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_consent_form_clause UNIQUE (consent_form_id, clause_id)
);

CREATE INDEX IF NOT EXISTS idx_consent_form_clauses_form ON consent_form_clauses (consent_form_id);

INSERT INTO consent_clauses (clause_key, title, body_text, sort_order) VALUES
('treatment_to_be_done', 'Treatment to be Done',
 'I understand and consent to have any treatment done by the dentist after the procedure, the risks & benefits & cost have been fully explained. These treatments include, but are not limited to, x-rays, cleanings, periodontal treatments, fillings, crowns, bridges, all types of extraction, root canals, &/or dentures, local anesthetics & surgical cases.', 1),
('drugs_and_medications', 'Drugs & Medications',
 'I understand that antibiotics, analgesics & other medications can cause allergic reactions like redness & swelling of tissues, pain, itching, vomiting, &/or anaphylactic shock.', 2),
('changes_in_treatment_plan', 'Changes in Treatment Plan',
 'I understand that during treatment it may be necessary to change/add procedures because of conditions found while working on the teeth that was not discovered during examination. For example, root canal therapy may be needed following routine restorative procedures. I give my permission to the dentist to make any/all changes and additions as necessary w/ my responsibility to pay all the costs agreed.', 3),
('radiograph', 'Radiograph',
 'I understand that an x-ray shot or a radiograph maybe necessary as part of diagnostic aid to come up with tentative diagnosis of my dental problem and to make a good treatment plan, but this will not give me a 100% assurance for the accuracy of the treatment since all dental treatments are subject to unpredictable complications that later on may lead to sudden change of treatment plan and subject to new charges.', 4),
('removal_of_teeth', 'Removal of Teeth',
 'I understand that alternatives to tooth removal (root canal therapy, crowns & periodontal surgery, etc.) & I completely understand these alternatives, including their risk & benefits prior to authorizing the dentist to remove teeth & any other structures necessary for reasons above. I understand that removing teeth does not always remove all the infections, if present, & it may be necessary to have further treatment. I understand the risk involved in having teeth removed, such as pain, swelling, spread of infection, dry socket, fractured jaw, loss of feeling on the teeth, lips, tongue & surrounding tissue that can last for an indefinite period of time. I understand that I may need further treatment under a specialist if complications arise during or following treatment.', 5),
('crowns_and_bridges', 'Crowns (Caps) & Bridges',
 'Preparing a tooth may irritate the nerve tissue in the center of the tooth, leaving the tooth extra sensitive to heat, cold & pressure. Treating such irritation may involve using special toothpastes, mouth rinses or root canal therapy. I understand that sometimes it is not possible to match the color of natural teeth exactly with artificial teeth. I further understand that I may be wearing temporary crowns, which may come off easily & that I must be careful to ensure that they are kept on until the permanent crowns are cemented. It is my responsibility to return for permanent cementation within 20 days from tooth preparation, as excessive days delay may allow for tooth movement, which may necessitate a remake of the crown, bridge/cap. I understand there will be additional charges for remakes due to my delaying of permanent cementation, & I realize that final opportunity to make changes in my new crown, bridge or cap (including shape, fit, size & color) will be before permanent cementation.', 6),
('endodontics_root_canal', 'Endodontics (Root Canal)',
 'I understand there is no guarantee that a root canal treatment will save a tooth & that complications can occur from the treatment & that occasionally root canal filling materials may extend through the tooth which does not necessarily affect the success of the treatment. I understand that endodontic files & drills are very fine instruments & stresses vented in their manufacture & calcifications present in teeth can cause them to break during use. I understand that referral to the endodontist for additional treatments may be necessary following any root canal treatment & I agree that I am responsible for any additional cost for treatment performed by the endodontist. I understand that a tooth may require removal in spite of all efforts to save it.', 7),
('periodontal_disease', 'Periodontal Disease',
 'I understand that periodontal disease is a serious condition causing gum & bone inflammation &/or loss & that can lead eventually to the loss of my teeth. I understand the alternative treatment plans to correct periodontal disease, including gum surgery tooth extractions with or without replacement. I understand that undertaking any dental procedures may have future adverse effect on my periodontal conditions.', 8),
('fillings', 'Fillings',
 'I understand that care must be exercised in chewing on fillings, especially during the first 24 hours to avoid breakage. I understand that a more extensive filling or a crown may be required, as additional decay or fracture may become evident after initial excavation. I understand that significant sensitivity is common, but usually temporary, after-effect of a newly placed filling. I further understand that filling a tooth may irritate the nerve tissue creating sensitivity & treating such sensitivity could require root canal therapy or extractions.', 9),
('dentures', 'Dentures',
 'I understand that wearing of dentures can be difficult. Sore spots, altered speech & difficulty in eating are common problems. Immediate dentures (placement of denture immediately after extractions) may be painful. Immediate dentures may require considerable adjusting & several relines. I understand that it is my responsibility to return for delivery of dentures. I understand that failure to keep my delivery appointment may result in poorly fitted dentures. If a remake is required due to my delays of more than 30 days, there will be additional charges. A permanent reline will be needed later, which is not included in the initial fee. I understand that all adjustment or alterations of any kind after this initial period is subject to charges.', 10)
ON CONFLICT (clause_key) DO NOTHING;

ALTER TABLE consent_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_form_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY consent_clauses_select ON consent_clauses
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY consent_form_clauses_select ON consent_form_clauses
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));

CREATE POLICY consent_form_clauses_insert ON consent_form_clauses
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'dentist'));

CREATE POLICY consent_form_clauses_update ON consent_form_clauses
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'reception', 'dentist'));
