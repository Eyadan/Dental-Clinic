import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { sendNotification } from "@/lib/services/notification-service";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

const EXPIRATION_HOURS = 24;

function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  const expected = `Bearer ${CRON_SECRET}`;
  if (authHeader.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - EXPIRATION_HOURS);

  const { data: staleAppointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      patient_id,
      created_at
    `)
    .eq("booking_status", "pending")
    .eq("is_archived", false)
    .lt("created_at", cutoff.toISOString());

  if (error) {
    console.error("[Cron Expiration] Failed to fetch stale appointments:", error.message);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }

  if (!staleAppointments || staleAppointments.length === 0) {
    console.log("[Cron Expiration] No stale pending appointments");
    return NextResponse.json({ expired: 0, message: "No appointments to expire" });
  }

  let expiredCount = 0;
  let notifiedCount = 0;

  for (const appointment of staleAppointments) {
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ booking_status: "expired" })
      .eq("id", appointment.id);

    if (updateError) {
      console.error(`[Cron Expiration] Failed to expire ${appointment.reference_no}:`, updateError.message);
      continue;
    }

    expiredCount++;

    const { data: patient } = await supabase
      .from("patients")
      .select("messenger_psid")
      .eq("id", appointment.patient_id)
      .maybeSingle();

    if (patient?.messenger_psid) {
      const result = await sendNotification({
        type: "custom",
        patientPsid: patient.messenger_psid,
        customMessage:
          `⏰ Your appointment request (${appointment.reference_no}) has expired.\n\n` +
          `Since it wasn't confirmed within 24 hours, the request has been cancelled. ` +
          `To book a new appointment, reply "book".`,
      });

      if (result.success) {
        notifiedCount++;
      }
    }
  }

  console.log(`[Cron Expiration] Expired: ${expiredCount}, Notified: ${notifiedCount}`);
  return NextResponse.json({ expired: expiredCount, notified: notifiedCount });
}
