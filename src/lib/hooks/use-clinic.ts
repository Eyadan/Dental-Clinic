"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { DentalServiceService, ClinicService } from "@/lib/services";

export function useDentalServices() {
  return useQuery({
    queryKey: ["dental-services"],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const service = new DentalServiceService(supabase);
      return service.getServices();
    },
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
  });
}
