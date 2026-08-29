import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required").min(12, "Password must be at least 12 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const dentistScheduleSchema = z.object({
  dentist_id: z.string().uuid("Invalid dentist ID"),
  day_of_week: z.number().int().min(0).max(6, "Day must be 0-6 (Sunday-Saturday)"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM format"),
});

export type DentistScheduleData = z.infer<typeof dentistScheduleSchema>;

export const dentalServiceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  default_duration_minutes: z.number().int().min(1, "Duration must be at least 1 minute").max(480, "Duration cannot exceed 8 hours"),
  default_price: z.number().min(0, "Price must be at least 0").max(999999.99, "Price too large"),
  is_active: z.boolean().default(true),
});

export type DentalServiceData = z.infer<typeof dentalServiceSchema>;

export const consentFormSchema = z.object({
  appointment_id: z.string().uuid("Invalid appointment ID"),
  treatment_info: z.string().min(1, "Treatment info is required"),
  consent_version: z.string().default("1.0"),
  signature_image_url: z.string().url("Invalid signature URL").optional().or(z.literal("")),
  staff_id: z.string().uuid("Invalid staff ID"),
});

export type ConsentFormData = z.infer<typeof consentFormSchema>;

export const treatmentRecordSchema = z.object({
  appointment_id: z.string().uuid("Invalid appointment ID"),
  diagnosis: z.string().max(2000).optional().or(z.literal("")),
  procedures: z.string().max(2000).optional().or(z.literal("")),
  clinical_notes: z.string().max(5000).optional().or(z.literal("")),
  prescriptions: z.string().max(2000).optional().or(z.literal("")),
  treatment_plan: z.string().max(2000).optional().or(z.literal("")),
});

export type TreatmentRecordData = z.infer<typeof treatmentRecordSchema>;

export const paymentSchema = z.object({
  invoice_id: z.string().uuid("Invalid invoice ID"),
  amount: z.number().positive("Amount must be positive").max(999999.99, "Amount too large"),
  method: z.enum(["cash", "gcash", "maya", "card", "bank_transfer"]),
  proof_image_url: z.string().url("Invalid proof image URL").optional().or(z.literal("")),
});

export type PaymentData = z.infer<typeof paymentSchema>;

export const clinicSettingSchema = z.object({
  setting_key: z.string().min(1).max(100),
  setting_value: z.string().min(1).max(1000),
  category: z.string().min(1).max(50),
  data_type: z.enum(["string", "integer", "boolean", "json"]).default("string"),
});

export type ClinicSettingData = z.infer<typeof clinicSettingSchema>;
