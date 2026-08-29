"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import type { ServiceResult } from "@/lib/services/base-service";

export async function getConsentFormAction(
  consentId: string,
): Promise<ServiceResult<{
  id: string;
  treatmentInfo: string;
  consentVersion: string;
  signedAt: string | null;
  signatureImageUrl: string | null;
  patientName: string;
  appointmentId: string;
}>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: consent, error } = await supabase
      .from("consent_forms")
      .select(`
        id,
        treatment_info,
        consent_version,
        signed_at,
        signature_image_url,
        appointment_id,
        appointments(patients(first_name, last_name))
      `)
      .eq("id", consentId)
      .single();

    if (error || !consent) {
      return { success: false, error: "Consent form not found" };
    }

    const patient = (consent.appointments as unknown as {
      patients: { first_name: string; last_name: string };
    }).patients;

    return {
      success: true,
      data: {
        id: consent.id,
        treatmentInfo: consent.treatment_info,
        consentVersion: consent.consent_version,
        signedAt: consent.signed_at,
        signatureImageUrl: consent.signature_image_url,
        patientName: `${patient.first_name} ${patient.last_name}`,
        appointmentId: consent.appointment_id,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch consent form",
    };
  }
}

export async function signConsentAction(
  consentId: string,
  signatureDataUrl: string,
): Promise<ServiceResult<void>> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: consent, error: fetchError } = await supabase
      .from("consent_forms")
      .select("signed_at")
      .eq("id", consentId)
      .single();

    if (fetchError || !consent) {
      return { success: false, error: "Consent form not found" };
    }

    if (consent.signed_at) {
      return { success: false, error: "Consent form already signed" };
    }

    const base64Data = signatureDataUrl.split(",")[1];
    if (!base64Data) {
      return { success: false, error: "Invalid signature data" };
    }

    const buffer = Buffer.from(base64Data, "base64");
    const fileName = `consent-${consentId}-${Date.now()}.png`;
    const filePath = `signatures/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("consent-signatures")
      .upload(filePath, buffer, {
        contentType: "image/png",
        upsert: false,
      });

    let signatureUrl: string;

    if (uploadError) {
      signatureUrl = `data:image/png;base64,${base64Data}`;
    } else {
      const { data: urlData } = supabase.storage
        .from("consent-signatures")
        .getPublicUrl(filePath);
      signatureUrl = urlData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("consent_forms")
      .update({
        signature_image_url: signatureUrl,
        signed_at: new Date().toISOString(),
      })
      .eq("id", consentId);

    if (updateError) {
      return { success: false, error: "Failed to save signature" };
    }

    revalidatePath("/queue");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sign consent",
    };
  }
}
