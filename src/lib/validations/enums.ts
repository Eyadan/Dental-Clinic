import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "reception", "dentist"]);

export const bookingStatusSchema = z.enum([
  "pending", "approved", "confirmed", "completed", "declined",
  "expired", "reschedule_required", "rescheduled",
  "pending_cancellation", "cancelled", "no_show",
]);

export const visitStatusSchema = z.enum([
  "checked_in", "waiting", "in_consultation", "consent_signed",
  "treatment_ongoing", "checkout", "completed", "delayed",
  "treatment_paused", "awaiting_requirement", "resumed",
]);

export const paymentStatusSchema = z.enum([
  "pending_payment", "partially_paid", "paid", "payment_failed", "refunded",
]);

export const paymentMethodSchema = z.enum([
  "cash", "gcash", "maya", "card", "bank_transfer",
]);

export const blockTypeSchema = z.enum(["vacation", "break", "sick_leave", "other"]);

export const recurrenceRuleSchema = z.enum(["none", "daily", "weekly", "monthly"]);

export const conversationStatusSchema = z.enum([
  "active", "taken_over", "ended", "bot_handled",
]);

export const messageDirectionSchema = z.enum(["inbound", "outbound"]);
