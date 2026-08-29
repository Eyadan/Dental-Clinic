export type UserRole = "admin" | "reception" | "dentist";

export type BookingStatus =
  | "pending"
  | "approved"
  | "confirmed"
  | "completed"
  | "declined"
  | "expired"
  | "reschedule_required"
  | "rescheduled"
  | "pending_cancellation"
  | "cancelled"
  | "no_show";

export type VisitStatus =
  | "checked_in"
  | "waiting"
  | "in_consultation"
  | "consent_signed"
  | "treatment_ongoing"
  | "checkout"
  | "completed"
  | "delayed"
  | "treatment_paused"
  | "awaiting_requirement"
  | "resumed";

export type PaymentStatus =
  | "pending_payment"
  | "partially_paid"
  | "paid"
  | "payment_failed"
  | "refunded";

export type PaymentMethod = "cash" | "gcash" | "maya" | "card" | "bank_transfer";

export type BlockType = "vacation" | "break" | "sick_leave" | "other";

export type RecurrenceRule = "none" | "daily" | "weekly" | "monthly";

export type ConversationStatus = "active" | "taken_over" | "ended" | "bot_handled";

export type MessageDirection = "inbound" | "outbound";
