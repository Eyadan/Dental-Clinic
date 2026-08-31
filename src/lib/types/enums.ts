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

export type ToothPresenceStatus = "present" | "missing" | "impacted" | "unerupted";

export type ToothFindingCategory = "condition" | "restoration" | "surgery";

export type ToothCondition =
  | "decayed"
  | "missing_caries"
  | "missing_other_causes"
  | "impacted"
  | "supernumerary"
  | "root_fragment"
  | "unerupted";

export type ToothRestoration =
  | "amalgam_filling"
  | "composite_filling"
  | "jacket_crown"
  | "abutment"
  | "attachment"
  | "pontic"
  | "inlay"
  | "implant"
  | "sealant"
  | "removable_denture";

export type ToothSurgery = "extraction_caries" | "extraction_other_causes";

export type ToothSurface = "mesial" | "distal" | "buccal" | "lingual" | "occlusal";
