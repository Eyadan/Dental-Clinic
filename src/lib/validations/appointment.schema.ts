import { z } from "zod";
import { bookingStatusSchema, visitStatusSchema, paymentStatusSchema } from "./enums";

export const appointmentCreateSchema = z.object({
  patient_id: z.string().uuid("Invalid patient ID"),
  dentist_id: z.string().uuid("Invalid dentist ID"),
  scheduled_date: z.string().date("Invalid date"),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
  total_duration: z.number().int().min(1, "Duration must be at least 1 minute"),
  service_ids: z.array(z.string().uuid()).min(1, "At least one service is required"),
});

export type AppointmentCreateData = z.infer<typeof appointmentCreateSchema>;

export const appointmentUpdateSchema = z.object({
  booking_status: bookingStatusSchema.optional(),
  visit_status: visitStatusSchema.nullable().optional(),
  payment_status: paymentStatusSchema.optional(),
  scheduled_date: z.string().date().optional(),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  dentist_id: z.string().uuid().optional(),
  is_archived: z.boolean().optional(),
});

export type AppointmentUpdateData = z.infer<typeof appointmentUpdateSchema>;

export const appointmentSearchSchema = z.object({
  dentist_id: z.string().uuid().optional(),
  patient_id: z.string().uuid().optional(),
  booking_status: bookingStatusSchema.optional(),
  visit_status: visitStatusSchema.optional(),
  payment_status: paymentStatusSchema.optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type AppointmentSearchParams = z.infer<typeof appointmentSearchSchema>;
