"use client";

// Re-export type definitions for server actions executed in consultation workspace
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { revalidatePath } from "next/cache";
import { getSingleJoined } from "@/lib/utils/supabase-join";

export interface PrescriptionItemData {
  id?: string;
  medicationName: string;
  genericName?: string;
  dosage: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

export interface PrescriptionData {
  id: string;
  appointmentId: string | null;
  patientId: string;
  dentistId: string;
  prescriptionNo: string;
  ptrNo: string | null;
  s2LicenseNo: string | null;
  clinicName: string;
  clinicAddress: string | null;
  clinicContact: string | null;
  notes: string | null;
  createdAt: string;

  // Joined Relations
  patientName: string;
  patientAgeSex?: string;
  patientAddress?: string;
  dentistName: string;
  dentistLicenseNo?: string;
  items: PrescriptionItemData[];
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
