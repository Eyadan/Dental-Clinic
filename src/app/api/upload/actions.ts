"use server";

import { generatePresignedUploadUrl, generatePresignedReadUrl } from "@/lib/services/r2-service";
import type { ServiceResult } from "@/lib/services/base-service";

export async function getPresignedUploadUrlAction(
  fileName: string,
  contentType: string,
  fileSize: number,
  category: "payment-proof" | "consent-signature" | "document",
): Promise<ServiceResult<{ uploadUrl: string; objectKey: string; publicUrl: string }>> {
  const result = await generatePresignedUploadUrl(fileName, contentType, fileSize, category);

  if (result.success && result.data) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error ?? "Failed to generate upload URL" };
}

export async function getPresignedReadUrlAction(
  objectKey: string,
): Promise<ServiceResult<{ readUrl: string }>> {
  const result = await generatePresignedReadUrl(objectKey);

  if (result.success && result.data) {
    return { success: true, data: { readUrl: result.data } };
  }

  return { success: false, error: result.error ?? "Failed to generate read URL" };
}
