import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { sendReminderWithQuickReplies } from "@/lib/services/notification-service";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

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

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      scheduled_date,
      scheduled_time,
      patient_id,
      dentists(
        users(first_name, last_name)
      )
    `)
    .eq("scheduled_date", tomorrowStr)
    .in("booking_status", ["approved", "confirmed"])
    .eq("is_archived", false);

  if (error) {
    console.error("[Cron Reminders] Failed to fetch appointments:", error.message);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }

  if (!appointments || appointments.length === 0) {
    console.log("[Cron Reminders] No appointments needing reminders tomorrow");
    return NextResponse.json({ sent: 0, message: "No reminders needed" });
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const appointment of appointments) {
    const { data: patient } = await supabase
      .from("patients")
      .select("messenger_psid")
      .eq("id", appointment.patient_id)
      .maybeSingle();

    if (!patient?.messenger_psid) {
      console.warn(`[Cron Reminders] Patient ${appointment.patient_id} has no PSID — skipping`);
      failedCount++;
      continue;
    }

    const dentist = Array.isArray(appointment.dentists)
      ? appointment.dentists[0]
      : appointment.dentists;
    const dentistUser = dentist
      ? (Array.isArray(dentist.users) ? dentist.users[0] : dentist.users)
      : null;
    const dentistName = dentistUser
      ? `${dentistUser.first_name} ${dentistUser.last_name}`
      : "TBD";

    const result = await sendReminderWithQuickReplies(
      patient.messenger_psid,
      appointment.reference_no,
      appointment.scheduled_date,
      appointment.scheduled_time,
      dentistName,
    );

    if (result.success) {
      sentCount++;
    } else {
      console.error(`[Cron Reminders] Failed for ${appointment.reference_no}: ${result.error}`);
      failedCount++;
    }
  }

  console.log(`[Cron Reminders] Sent: ${sentCount}, Failed: ${failedCount}`);
  return NextResponse.json({ sent: sentCount, failed: failedCount });
}
