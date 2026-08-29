import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") ?? "";
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  if (query.trim().length < 2) {
    return NextResponse.json({ appointments: [] });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: patients, error: patientError } = await supabase
    .from("patients")
    .select("id, first_name, last_name, contact_no")
    .eq("is_archived", false)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,contact_no.ilike.%${query}%`)
    .limit(20);

  if (patientError) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  if (!patients || patients.length === 0) {
    const { data: apptsByRef, error: refError } = await supabase
      .from("appointments")
      .select(`
        id,
        reference_no,
        booking_status,
        visit_status,
        scheduled_time,
        total_duration,
        patients!inner(first_name, last_name, contact_no)
      `)
      .eq("scheduled_date", date)
      .eq("is_archived", false)
      .ilike("reference_no", `%${query}%`)
      .in("booking_status", ["approved", "confirmed"]);

    if (refError) {
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    const refResults = (apptsByRef ?? []).map((appt: Record<string, unknown>) => {
      const patient = appt.patients as { first_name: string; last_name: string; contact_no: string };
      return {
        id: appt.id as string,
        reference_no: appt.reference_no as string,
        booking_status: appt.booking_status as string,
        visit_status: appt.visit_status as string | null,
        scheduled_time: appt.scheduled_time as string,
        total_duration: appt.total_duration as number,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        patient_contact: patient.contact_no,
      };
    });

    return NextResponse.json({ appointments: refResults });
  }

  const patientIds = patients.map((p) => p.id);

  const { data: appointments, error: apptError } = await supabase
    .from("appointments")
    .select(`
      id,
      reference_no,
      booking_status,
      visit_status,
      scheduled_time,
      total_duration,
      patients!inner(first_name, last_name, contact_no)
    `)
    .eq("scheduled_date", date)
    .eq("is_archived", false)
    .in("patient_id", patientIds)
    .in("booking_status", ["approved", "confirmed"])
    .order("scheduled_time");

  if (apptError) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  const results = (appointments ?? []).map((appt: Record<string, unknown>) => {
    const patient = appt.patients as { first_name: string; last_name: string; contact_no: string };
    return {
      id: appt.id as string,
      reference_no: appt.reference_no as string,
      booking_status: appt.booking_status as string,
      visit_status: appt.visit_status as string | null,
      scheduled_time: appt.scheduled_time as string,
      total_duration: appt.total_duration as number,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_contact: patient.contact_no,
    };
  });

  return NextResponse.json({ appointments: results });
}
