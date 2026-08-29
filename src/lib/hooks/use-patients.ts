"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { PatientService } from "@/lib/services/patient-service";
import type { PatientSearchParams } from "@/lib/validations/patient.schema";

export function usePatients(params: PatientSearchParams) {
  return useQuery({
    queryKey: ["patients", params],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const service = new PatientService(supabase);
      return service.getPatients(params);
    },
  });
}

export function usePatient(id: string | null) {
  return useQuery({
    queryKey: ["patient", id],
    enabled: id !== null,
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const service = new PatientService(supabase);
      return service.getPatientById(id!);
    },
  });
}
