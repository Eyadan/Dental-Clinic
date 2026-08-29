import { z } from "zod";

const phoneRegex = /^(\+63|0)[0-9]{10}$/;

export const patientSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  contact_no: z.string().min(1, "Contact number is required").regex(phoneRegex, "Invalid Philippine phone number"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  birth_date: z.string().date().optional().or(z.literal("")),
  medical_history: z.string().max(2000).optional().or(z.literal("")),
  allergies: z.string().max(500).optional().or(z.literal("")),
});

export type PatientFormData = z.infer<typeof patientSchema>;

export const patientSearchSchema = z.object({
  query: z.string().min(1).max(100),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type PatientSearchParams = z.infer<typeof patientSearchSchema>;
