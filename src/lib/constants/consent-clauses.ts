import type { ConsentClause } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Standard 10 Informed Consent Clauses per Philippine Dental Association (PDA) Dental Chart.
 * Used as the canonical fallback whenever reference tables have not been populated in the database.
 */
export const DEFAULT_PDA_CONSENT_CLAUSES: ConsentClause[] = [
  {
    id: "fc928c08-9f88-4150-9458-502610cd6be6",
    clause_key: "treatment_to_be_done",
    title: "Treatment to be Done",
    body_text:
      "I understand and consent to have any treatment done by the dentist after the procedure, the risks & benefits & cost have been fully explained. These treatments include, but are not limited to, x-rays, cleanings, periodontal treatments, fillings, crowns, bridges, all types of extraction, root canals, &/or dentures, local anesthetics & surgical cases.",
    sort_order: 1,
    is_active: true,
    created_at: "2026-08-31T19:00:00.000Z",
  },
  {
    id: "84dd24f5-5308-480f-80a9-632dffed0e73",
    clause_key: "drugs_and_medications",
    title: "Drugs & Medications",
    body_text:
      "I understand that antibiotics, analgesics & other medications can cause allergic reactions like redness & swelling of tissues, pain, itching, vomiting, &/or anaphylactic shock.",
    sort_order: 2,
    is_active: true,
    created_at: "2026-08-31T19:00:00.000Z",
  },
  {
    id: "9cf60f26-ff9f-4030-b74d-c81ec98409d8",
    clause_key: "changes_in_treatment_plan",
    title: "Changes in Treatment Plan",
    body_text:
      "I understand that during treatment it may be necessary to change/add procedures because of conditions found while working on the teeth that was not discovered during examination. For example, root canal therapy may be needed following routine restorative procedures. I give my permission to the dentist to make any/all changes and additions as necessary w/ my responsibility to pay all the costs agreed.",
    sort_order: 3,
    is_active: true,
    created_at: "2026-08-31T19:00:00.000Z",
  },
  {
    id: "78fde3f3-3180-46fa-9946-c6515ca0892c",
    clause_key: "radiograph",
    title: "Radiograph",
    body_text:
      "I understand that an x-ray shot or a radiograph maybe necessary as part of diagnostic aid to come up with tentative diagnosis of my dental problem and to make a good treatment plan, but this will not give me a 100% assurance for the accuracy of the treatment since all dental treatments are subject to unpredictable complications that later on may lead to sudden change of treatment plan and subject to new charges.",
    sort_order: 4,
    is_active: true,
    created_at: "2026-08-31T19:00:00.000Z",
  },
  {
    id: "e8f9532d-cc04-4101-b66e-435e2aab0ef4",
    clause_key: "removal_of_teeth",
    title: "Removal of Teeth",
    body_text:
      "I understand that alternatives to tooth removal (root canal therapy, crowns & periodontal surgery, etc.) & I completely understand these alternatives, including their risk & benefits prior to authorizing the dentist to remove teeth & any other structures necessary for reasons above. I understand that removing teeth does not always remove all the infections, if present, & it may be necessary to have further treatment. I understand the risk involved in having teeth removed, such as pain, swelling, spread of infection, dry socket, fractured jaw, loss of feeling on the teeth, lips, tongue & surrounding tissue that can last for an indefinite period of time. I understand that I may need further treatment under a specialist if complications arise during or following treatment.",
    sort_order: 5,
    is_active: true,
    created_at: "2026-08-31T19:00:00.000Z",
  },
  {
    id: "1eaa7284-8202-4a57-b998-79deeb04946e",
    clause_key: "crowns_and_bridges",
    title: "Crowns (Caps) & Bridges",
    body_text:
      "Preparing a tooth may irritate the nerve tissue in the center of the tooth, leaving the tooth extra sensitive to heat, cold & pressure. Treating such irritation may involve using special toothpastes, mouth rinses or root canal therapy. I understand that sometimes it is not possible to match the color of natural teeth exactly with artificial teeth. I further understand that I may be wearing temporary crowns, which may come off easily & that I must be careful to ensure that they are kept on until the permanent crowns are cemented. It is my responsibility to return for permanent cementation within 20 days from tooth preparation, as excessive days delay may allow for tooth movement, which may necessitate a remake of the crown, bridge/cap. I understand there will be additional charges for remakes due to my delaying of permanent cementation, & I realize that final opportunity to make changes in my new crown, bridge or cap (including shape, fit, size & color) will be before permanent cementation.",
    sort_order: 6,
    is_active: true,
    created_at: "2026-08-31T19:00:00.000Z",
  },
  {
    id: "f868740b-1f7d-4dcf-8218-13fbd4b128d5",
    clause_key: "endodontics_root_canal",
    title: "Endodontics (Root Canal)",
    body_text:
      "I understand there is no guarantee that a root canal treatment will save a tooth & that complications can occur from the treatment & that occasionally root canal filling materials may extend through the tooth which does not necessarily affect the success of the treatment. I understand that endodontic files & drills are very fine instruments & stresses vented in their manufacture & calcifications present in teeth can cause them to break during use. I understand that referral to the endodontist for additional treatments may be necessary following any root canal treatment & I agree that I am responsible for any additional cost for treatment performed by the endodontist. I understand that a tooth may require removal in spite of all efforts to save it.",
    sort_order: 7,
    is_active: true,
    created_at: "2026-08-31T19:00:00.000Z",
  },
  {
    id: "c3a0d174-9ad2-4ff2-86a5-9e0e8f65bf15",
    clause_key: "periodontal_disease",
    title: "Periodontal Disease",
    body_text:
      "I understand that periodontal disease is a serious condition causing gum & bone inflammation &/or loss & that can lead eventually to the loss of my teeth. I understand the alternative treatment plans to correct periodontal disease, including gum surgery tooth extractions with or without replacement. I understand that undertaking any dental procedures may have future adverse effect on my periodontal conditions.",
    sort_order: 8,
    is_active: true,
    created_at: "2026-08-31T19:00:00.000Z",
  },
  {
    id: "4a309794-113f-4a9c-91eb-ae1d40a3df81",
    clause_key: "fillings",
    title: "Fillings",
    body_text:
      "I understand that care must be exercised in chewing on fillings, especially during the first 24 hours to avoid breakage. I understand that a more extensive filling or a crown may be required, as additional decay or fracture may become evident after initial excavation. I understand that significant sensitivity is common, but usually temporary, after-effect of a newly placed filling. I further understand that filling a tooth may irritate the nerve tissue creating sensitivity & treating such sensitivity could require root canal therapy or extractions.",
    sort_order: 9,
    is_active: true,
    created_at: "2026-08-31T19:00:00.000Z",
  },
  {
    id: "0cf80a21-b571-4697-9fb7-ebd3a215aeb7",
    clause_key: "dentures",
    title: "Dentures",
    body_text:
      "I understand that wearing of dentures can be difficult. Sore spots, altered speech & difficulty in eating are common problems. Immediate dentures (placement of denture immediately after extractions) may be painful. Immediate dentures may require considerable adjusting & several relines. I understand that it is my responsibility to return for delivery of dentures. I understand that failure to keep my delivery appointment may result in poorly fitted dentures. If a remake is required due to my delays of more than 30 days, there will be additional charges. A permanent reline will be needed later, which is not included in the initial fee. I understand that all adjustment or alterations of any kind after this initial period is subject to charges.",
    sort_order: 10,
    is_active: true,
    created_at: "2026-08-31T19:00:00.000Z",
  },
];

/**
 * Ensures consent clauses are loaded from the database, auto-seeding if empty,
 * and falling back to canonical PDA clauses if database is unavailable.
 */
export async function ensureConsentClauses(
  supabase?: SupabaseClient,
): Promise<ConsentClause[]> {
  if (!supabase) {
    return DEFAULT_PDA_CONSENT_CLAUSES;
  }

  try {
    const { data: clauses, error } = await supabase
      .from("consent_clauses")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (!error && clauses && clauses.length > 0) {
      return clauses;
    }

    // Attempt to seed if table exists but has no active rows
    const { data: inserted, error: insertError } = await supabase
      .from("consent_clauses")
      .upsert(
        DEFAULT_PDA_CONSENT_CLAUSES.map((c) => ({
          clause_key: c.clause_key,
          title: c.title,
          body_text: c.body_text,
          sort_order: c.sort_order,
          is_active: true,
        })),
        { onConflict: "clause_key" },
      )
      .select("*")
      .order("sort_order");

    if (!insertError && inserted && inserted.length > 0) {
      return inserted;
    }

    return DEFAULT_PDA_CONSENT_CLAUSES;
  } catch {
    return DEFAULT_PDA_CONSENT_CLAUSES;
  }
}
