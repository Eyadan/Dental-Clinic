import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "dental-clinic";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

const PRESIGNED_URL_EXPIRY = 15 * 60;

const MAX_FILE_SIZES: Record<string, number> = {
  "payment-proof": 10 * 1024 * 1024,
  "consent-signature": 5 * 1024 * 1024,
  "document": 10 * 1024 * 1024,
};

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];

function createR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

export function validateFileType(fileName: string, contentType: string): { valid: boolean; error?: string } {
  if (!ALLOWED_FILE_TYPES.includes(contentType)) {
    return { valid: false, error: `File type ${contentType} not allowed. Accepted: JPG, PNG, PDF` };
  }

  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File extension ${ext} not allowed. Accepted: .jpg, .jpeg, .png, .pdf` };
  }

  return { valid: true };
}

export function validateFileSize(fileSize: number, category: keyof typeof MAX_FILE_SIZES): { valid: boolean; error?: string } {
  const maxSize = MAX_FILE_SIZES[category];
  if (fileSize > maxSize) {
    const maxMB = Math.floor(maxSize / (1024 * 1024));
    return { valid: false, error: `File size exceeds ${maxMB}MB limit` };
  }
  return { valid: true };
}

export interface PresignedUploadResult {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
}

export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  fileSize: number,
  category: keyof typeof MAX_FILE_SIZES,
): Promise<{ success: boolean; data?: PresignedUploadResult; error?: string }> {
  const typeCheck = validateFileType(fileName, contentType);
  if (!typeCheck.valid) {
    return { success: false, error: typeCheck.error };
  }

  const sizeCheck = validateFileSize(fileSize, category);
  if (!sizeCheck.valid) {
    return { success: false, error: sizeCheck.error };
  }

  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  const objectKey = `${category}/${randomUUID()}-${Date.now()}${ext}`;

  if (!isR2Configured()) {
    return {
      success: false,
      error: "R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY environment variables.",
    };
  }

  try {
    const client = createR2Client();
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: PRESIGNED_URL_EXPIRY });
    const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${objectKey}` : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${objectKey}`;

    return {
      success: true,
      data: { uploadUrl, objectKey, publicUrl },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate upload URL",
    };
  }
}

export async function generatePresignedReadUrl(objectKey: string): Promise<{ success: boolean; data?: string; error?: string }> {
  if (!isR2Configured()) {
    return {
      success: false,
      error: "R2 storage not configured.",
    };
  }

  try {
    const client = createR2Client();
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
    });

    const readUrl = await getSignedUrl(client, command, { expiresIn: PRESIGNED_URL_EXPIRY });

    return { success: true, data: readUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate read URL",
    };
  }
}

export function extractObjectKeyFromUrl(url: string): string | null {
  try {
    if (url.startsWith("data:")) return null;
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) return null;
    return pathParts.slice(1).join("/");
  } catch {
    return null;
  }
}
