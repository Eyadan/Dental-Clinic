import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import type {
  MedicalCondition,
  ConsentClause,
  DentalService,
  ClinicSetting,
  Dentist,
  DentistSchedule,
} from "@/lib/types/database";

/**
 * Cross-request cache for reference data.
 *
 * Security rules (see docs/plan.md Phase 11 security review):
 * - Only tables whose rows are IDENTICAL for all users may be cached here.
 *   Verified: all tables below have `SELECT ... TO authenticated USING (true)`.
 * - NEVER cache a query whose rows depend on the requesting user/role.
 * - NEVER cache service-role results for per-user data (RLS bypass leak).
 * - Every tag must have a revalidateTag() call in its mutation actions.
 * - clinic_holidays is intentionally NOT cached: its reads drive booking
 *   correctness and the table is SQL-managed (no mutation action exists to
 *   fire revalidateTag).
 */

export const CACHE_TAGS = {
  medicalConditions: "medical-conditions",
  consentClauses: "consent-clauses",
  dentalServices: "dental-services",
  clinicSettings: "clinic-settings",
  dentists: "dentists",
  dentistSchedules: "dentist-schedules",
} as const;

// unstable_cache cannot call cookies()/headers(), so cached functions build
// their own cookie-free client. Service role is safe here ONLY because every
// table above returns identical rows for all users.
function getCacheClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env vars for cached reference data");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const DAY = 86400;
// Backstop TTL for tag-based caches so out-of-band SQL edits still converge.
const HOUR = 3600;

export const getCachedMedicalConditions = unstable_cache(
  async (): Promise<MedicalCondition[]> => {
    const { data, error } = await getCacheClient()
      .from("medical_conditions")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["medical-conditions"],
  { tags: [CACHE_TAGS.medicalConditions], revalidate: DAY },
);

export const getCachedConsentClauses = unstable_cache(
  async (): Promise<ConsentClause[]> => {
    const { data, error } = await getCacheClient()
      .from("consent_clauses")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["consent-clauses"],
  { tags: [CACHE_TAGS.consentClauses], revalidate: DAY },
);

export const getCachedActiveDentalServices = unstable_cache(
  async (): Promise<DentalService[]> => {
    const { data, error } = await getCacheClient()
      .from("dental_services")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["dental-services-active"],
  { tags: [CACHE_TAGS.dentalServices], revalidate: HOUR },
);

export const getCachedAllDentalServices = unstable_cache(
  async (): Promise<DentalService[]> => {
    const { data, error } = await getCacheClient()
      .from("dental_services")
      .select("*")
      .order("is_active", { ascending: false })
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["dental-services-all"],
  { tags: [CACHE_TAGS.dentalServices], revalidate: HOUR },
);

export const getCachedClinicSettings = unstable_cache(
  async (): Promise<ClinicSetting[]> => {
    const { data, error } = await getCacheClient()
      .from("clinic_settings")
      .select("*")
      .order("category")
      .order("setting_key");
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["clinic-settings"],
  { tags: [CACHE_TAGS.clinicSettings], revalidate: HOUR },
);

export const getCachedDentists = unstable_cache(
  async (): Promise<Dentist[]> => {
    const { data, error } = await getCacheClient()
      .from("dentists")
      .select("*, users(first_name, last_name)")
      .eq("is_active", true)
      .order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((d: Record<string, unknown>) => {
      const userObj = getSingleJoined<{ first_name: string; last_name: string }>(d.users);
      const fullName = userObj ? `${userObj.first_name} ${userObj.last_name}` : "";
      return { ...d, full_name: fullName } as Dentist;
    });
  },
  ["dentists-active"],
  { tags: [CACHE_TAGS.dentists], revalidate: HOUR },
);

export const getCachedDentistSchedules = unstable_cache(
  async (dentistId: string): Promise<DentistSchedule[]> => {
    const { data, error } = await getCacheClient()
      .from("dentist_schedules")
      .select("*")
      .eq("dentist_id", dentistId)
      .order("day_of_week");
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["dentist-schedules"],
  { tags: [CACHE_TAGS.dentistSchedules], revalidate: HOUR },
);
