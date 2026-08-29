"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { AppointmentService } from "@/lib/services/appointment-service";
import type { AppointmentSearchParams } from "@/lib/validations/appointment.schema";

export function useAppointments(params: AppointmentSearchParams) {
  return useQuery({
    queryKey: ["appointments", params],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const service = new AppointmentService(supabase);
      return service.getAppointments(params);
    },
  });
}

export function useAppointment(id: string | null) {
  return useQuery({
    queryKey: ["appointment", id],
    enabled: id !== null,
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const service = new AppointmentService(supabase);
      return service.getAppointmentById(id!);
    },
  });
}
