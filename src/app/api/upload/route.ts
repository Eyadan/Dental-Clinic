import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { generatePresignedUploadUrl } from "@/lib/services/r2-service";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, contentType, fileSize, category } = body as {
      fileName: string;
      contentType: string;
      fileSize: number;
      category: "payment-proof" | "consent-signature" | "document";
    };

    if (!fileName || !contentType || !fileSize || !category) {
      return NextResponse.json(
        { error: "Missing required fields: fileName, contentType, fileSize, category" },
        { status: 400 },
      );
    }

    const result = await generatePresignedUploadUrl(fileName, contentType, fileSize, category);

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
