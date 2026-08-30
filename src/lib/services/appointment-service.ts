import type { SupabaseClient } from "@supabase/supabase-js";
import type { Appointment } from "@/lib/types/database";
import type { AppointmentCreateData, AppointmentUpdateData, AppointmentSearchParams } from "@/lib/validations/appointment.schema";
import { BaseService, type PaginatedResult } from "./base-service";

export class AppointmentService extends BaseService {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  async getAppointments(params: AppointmentSearchParams): Promise<PaginatedResult<Appointment>> {
    const { page, pageSize, dentist_id, patient_id, booking_status, visit_status, payment_status, date_from, date_to } = params;
    const offset = (page - 1) * pageSize;

    let query = this.supabase
      .from("appointments")
      .select("*", { count: "exact" })
      .eq("is_archived", false);

    if (dentist_id) query = query.eq("dentist_id", dentist_id);
    if (patient_id) query = query.eq("patient_id", patient_id);
    if (booking_status) query = query.eq("booking_status", booking_status);
    if (visit_status) query = query.eq("visit_status", visit_status);
    if (payment_status) query = query.eq("payment_status", payment_status);
    if (date_from) query = query.gte("scheduled_date", date_from);
    if (date_to) query = query.lte("scheduled_date", date_to);

    const { data, error, count } = await query
      .range(offset, offset + pageSize - 1)
      .order("scheduled_date", { ascending: false })
      .order("scheduled_time", { ascending: false });

    if (error) this.handleError(error);

    return {
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
      hasMore: (count ?? 0) > offset + pageSize,
    };
  }

  async getAppointmentById(id: string): Promise<Appointment | null> {
    const { data, error } = await this.supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      this.handleError(error);
    }

    return data;
  }

  async createAppointment(data: AppointmentCreateData): Promise<Appointment> {
    const { data: result, error } = await this.supabase
      .from("appointments")
      .insert({
        patient_id: data.patient_id,
        dentist_id: data.dentist_id,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        total_duration: data.total_duration,
        booking_status: data.booking_status ?? "approved",
      })
      .select()
      .single();

    if (error) this.handleError(error);

    if (result) {
      const serviceRows = data.service_ids.map((service_id) => ({
        appointment_id: result.id,
        service_id,
      }));

      const { error: svcError } = await this.supabase
        .from("appointment_services")
        .insert(serviceRows);

      if (svcError) this.handleError(svcError);
    }

    return result;
  }

  async updateAppointment(id: string, data: AppointmentUpdateData): Promise<Appointment> {
    const { data: result, error } = await this.supabase
      .from("appointments")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) this.handleError(error);

    return result;
  }

  async archiveAppointment(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("appointments")
      .update({ is_archived: true })
      .eq("id", id);

    if (error) this.handleError(error);
  }
}
