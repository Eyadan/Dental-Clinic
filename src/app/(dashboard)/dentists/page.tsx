import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getSingleJoined } from "@/lib/utils/supabase-join";
import {
  DentistsClient,
  type DoctorDirectoryItem,
  type DoctorLeaveRecord,
} from "./dentists-client";

export default async function DentistsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: dentistsData, error } = await supabase
    .from("dentists")
    .select(`
      id,
      user_id,
      license_no,
      specialization,
      is_active,
      created_at,
      users (
        id,
        first_name,
        last_name,
        email,
        is_active
      ),
      dentist_schedules (
        id,
        day_of_week,
        start_time,
        end_time,
        is_active
      ),
      dentist_blocks (
        id,
        start_datetime,
        end_datetime,
        block_type,
        reason
      )
    `)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[DentistsPage] Error fetching dentists:", error);
  }

  const nowIso = new Date().toISOString();
  const allLeaveRecords: DoctorLeaveRecord[] = [];

  const doctors: DoctorDirectoryItem[] = (dentistsData ?? []).map((d) => {
    const user = getSingleJoined<{
      first_name: string;
      last_name: string;
      email: string;
      is_active: boolean;
    }>(d.users);

    const fullName = user
      ? `Dr. ${user.first_name} ${user.last_name}`
      : "Dr. Unknown";

    const schedules = ((d.dentist_schedules as Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_active: boolean;
    }>) ?? [])
      .filter((s) => s.is_active)
      .map((s) => ({
        dayOfWeek: s.day_of_week,
        startTime: s.start_time,
        endTime: s.end_time,
        isActive: s.is_active,
      }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

    const rawBlocks = ((d.dentist_blocks as Array<{
      id: string;
      start_datetime: string;
      end_datetime: string;
      block_type: string;
      reason: string | null;
    }>) ?? []);

    for (const b of rawBlocks) {
      let status: "active_now" | "upcoming" | "completed" = "completed";
      if (b.start_datetime <= nowIso && b.end_datetime >= nowIso) {
        status = "active_now";
      } else if (b.start_datetime > nowIso) {
        status = "upcoming";
      }

      allLeaveRecords.push({
        id: b.id,
        dentistId: d.id,
        dentistName: fullName,
        specialization: d.specialization || "General Dentistry",
        licenseNo: d.license_no,
        startDatetime: b.start_datetime,
        endDatetime: b.end_datetime,
        blockType: b.block_type,
        reason: b.reason,
        status,
      });
    }

    const upcomingBlocks = rawBlocks
      .filter((b) => b.end_datetime >= nowIso)
      .map((b) => ({
        id: b.id,
        startDatetime: b.start_datetime,
        endDatetime: b.end_datetime,
        blockType: b.block_type,
        reason: b.reason,
      }))
      .sort((a, b) => a.startDatetime.localeCompare(b.startDatetime));

    return {
      id: d.id,
      userId: d.user_id,
      fullName,
      email: user?.email ?? "",
      licenseNo: d.license_no,
      specialization: d.specialization || "General Dentistry",
      isActive: d.is_active,
      schedules,
      upcomingBlocks,
    };
  });

  allLeaveRecords.sort((a, b) => {
    const priority = { active_now: 0, upcoming: 1, completed: 2 };
    if (priority[a.status] !== priority[b.status]) {
      return priority[a.status] - priority[b.status];
    }
    return b.startDatetime.localeCompare(a.startDatetime);
  });

  return <DentistsClient doctors={doctors} leaveRecords={allLeaveRecords} />;
}
