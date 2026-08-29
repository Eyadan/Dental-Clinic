export const TOOTH_STATES = {
  HEALTHY: { label: "Healthy", fill: "#FFFFFF", border: "#E5E7EB" },
  CARIES: { label: "Caries", fill: "#FEE2E2", border: "#DC2626" },
  FILLED: { label: "Filled", fill: "#DBEAFE", border: "#2563EB" },
  CROWN: { label: "Crown", fill: "#FEF3C7", border: "#F59E0B" },
  MISSING: { label: "Missing", fill: "#F3F4F6", border: "#9CA3AF", dashed: true },
  IMPLANT: { label: "Implant", fill: "#EDE9FE", border: "#8B5CF6" },
  ROOT_CANAL: { label: "Root Canal", fill: "#1E3A8A", border: "#1E3A8A" },
  BRIDGE: { label: "Bridge", fill: "#CCFBF1", border: "#14B8A6" },
  EXTRACTION_NEEDED: { label: "Extraction Needed", fill: "#FEE2E2", border: "#DC2626", striped: true },
} as const;

export type ToothState = keyof typeof TOOTH_STATES;

export const BOOKING_STATUS_STYLES = {
  PENDING: { label: "Pending", variant: "warning" as const },
  APPROVED: { label: "Approved", variant: "info" as const },
  CONFIRMED: { label: "Confirmed", variant: "success" as const },
  COMPLETED: { label: "Completed", variant: "success" as const },
  DECLINED: { label: "Declined", variant: "danger" as const },
  EXPIRED: { label: "Expired", variant: "danger" as const },
  RESCHEDULE_REQUIRED: { label: "Reschedule Required", variant: "warning" as const },
  RESCHEDULED: { label: "Rescheduled", variant: "info" as const },
  PENDING_CANCELLATION: { label: "Pending Cancellation", variant: "warning" as const },
  CANCELLED: { label: "Cancelled", variant: "danger" as const },
  NO_SHOW: { label: "No Show", variant: "danger" as const },
} as const;

export const VISIT_STATUS_STYLES = {
  CHECKED_IN: { label: "Checked In", variant: "info" as const },
  WAITING: { label: "Waiting", variant: "warning" as const },
  IN_CONSULTATION: { label: "In Consultation", variant: "purple" as const },
  CONSENT_SIGNED: { label: "Consent Signed", variant: "teal" as const },
  TREATMENT_ONGOING: { label: "Treatment Ongoing", variant: "purple" as const },
  CHECKOUT: { label: "Checkout", variant: "teal" as const },
  COMPLETED: { label: "Completed", variant: "success" as const },
  DELAYED: { label: "Delayed", variant: "warning" as const },
  TREATMENT_PAUSED: { label: "Treatment Paused", variant: "warning" as const },
  AWAITING_REQUIREMENT: { label: "Awaiting Requirement", variant: "warning" as const },
  RESUMED: { label: "Resumed", variant: "info" as const },
} as const;

export const PAYMENT_STATUS_STYLES = {
  PENDING_PAYMENT: { label: "Pending Payment", variant: "warning" as const },
  PARTIALLY_PAID: { label: "Partially Paid", variant: "info" as const },
  PAID: { label: "Paid", variant: "success" as const },
  PAYMENT_FAILED: { label: "Payment Failed", variant: "danger" as const },
  REFUNDED: { label: "Refunded", variant: "danger" as const },
} as const;
