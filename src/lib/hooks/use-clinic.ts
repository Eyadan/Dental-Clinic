"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { DentalServiceService, ClinicService } from "@/lib/services";

const REFERENCE_STALE_TIME = 5 * 60 * 1000;

export function useDentalServices() {
  return useQuery({
    queryKey: ["dental-services"],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const service = new DentalServiceService(supabase);
      return service.getServices();
    },
    staleTime: REFERENCE_STALE_TIME,
  });
}

export function useClinicSettings() {
  return useQuery({
    queryKey: ["clinic-settings"],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const service = new ClinicService(supabase);
      return service.getSettings();
    },
    staleTime: REFERENCE_STALE_TIME,
  });
}
