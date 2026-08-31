import type {
  UserRole,
  BookingStatus,
  VisitStatus,
  PaymentStatus,
  PaymentMethod,
  BlockType,
  RecurrenceRule,
  ConversationStatus,
  MessageDirection,
  ToothCondition,
  ToothRestoration,
  ToothSurgery,
  ToothSurface,
  ToothPresenceStatus,
  ToothFindingCategory,
} from "./enums";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dentist {
  id: string;
  user_id: string;
  license_no: string;
  specialization: string | null;
  full_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DentistSchedule {
  id: string;
  dentist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DentistBlock {
  id: string;
  dentist_id: string;
  start_datetime: string;
  end_datetime: string;
  block_type: BlockType;
  recurrence_rule: RecurrenceRule;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  category: string;
  data_type: string;
  created_at: string;
  updated_at: string;
}

export interface ClinicHoliday {
  id: string;
  date: string;
  description: string | null;
  is_half_day: boolean;
  operating_hours: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  contact_no: string;
  email: string | null;
  birth_date: string | null;
  sex: "M" | "F" | null;
  nickname: string | null;
  religion: string | null;
  nationality: string | null;
  home_address: string | null;
  home_no: string | null;
  office_no: string | null;
  fax_no: string | null;
  occupation: string | null;
  dental_insurance: string | null;
  insurance_effective_date: string | null;
  guardian_name: string | null;
  guardian_occupation: string | null;
  referred_by: string | null;
  consultation_reason: string | null;
  medical_history: string | null;
  allergies: string | null;
  messenger_psid: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientMedicalRecord {
  id: string;
  patient_id: string;
  previous_dentist: string | null;
  last_dental_visit: string | null;
  physician_name: string | null;
  physician_specialty: string | null;
  physician_office_address: string | null;
  physician_office_no: string | null;
  is_in_good_health: boolean | null;
  is_under_medical_treatment: boolean | null;
  medical_treatment_condition: string | null;
  had_serious_illness_or_surgery: boolean | null;
  illness_or_surgery_details: string | null;
  was_hospitalized: boolean | null;
  hospitalization_details: string | null;
  taking_medication: boolean | null;
  medication_details: string | null;
  uses_tobacco: boolean | null;
  uses_alcohol_or_drugs: boolean | null;
  allergy_local_anesthetic: boolean;
  allergy_penicillin_antibiotics: boolean;
  allergy_sulfa_drugs: boolean;
  allergy_aspirin: boolean;
  allergy_latex: boolean;
  allergy_others: string | null;
  bleeding_time: string | null;
  is_pregnant: boolean | null;
  is_nursing: boolean | null;
  taking_birth_control: boolean | null;
  blood_type: string | null;
  blood_pressure: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicalCondition {
  id: string;
  name: string;
  created_at: string;
}

export interface PatientMedicalCondition {
  id: string;
  patient_id: string;
  condition_id: string;
  created_at: string;
}

export interface DentalService {
  id: string;
  name: string;
  description: string | null;
  default_duration_minutes: number;
  default_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  booking_status: BookingStatus;
  visit_status: VisitStatus | null;
  payment_status: PaymentStatus;
  scheduled_date: string;
  scheduled_time: string;
  total_duration: number;
  reference_no: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppointmentService {
  id: string;
  appointment_id: string;
  service_id: string;
  price: number;
  created_at: string;
}

export interface AppointmentHistory {
  id: string;
  appointment_id: string;
  changed_by: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

export interface QrCode {
  id: string;
  appointment_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  is_used: boolean;
  created_at: string;
}

export interface ConsentForm {
  id: string;
  appointment_id: string;
  treatment_info: string;
  consent_version: string;
  signature_image_url: string | null;
  signed_at: string | null;
  staff_id: string;
  created_at: string;
  updated_at: string;
}

export interface ConsentClause {
  id: string;
  clause_key: string;
  title: string;
  body_text: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ConsentFormClause {
  id: string;
  consent_form_id: string;
  clause_id: string;
  patient_initials: string | null;
  initialed_at: string | null;
  created_at: string;
}

export interface DentalChart {
  id: string;
  patient_id: string;
  periodontal_gingivitis: boolean;
  periodontal_early_periodontitis: boolean;
  periodontal_moderate_periodontitis: boolean;
  periodontal_advanced_periodontitis: boolean;
  occlusion_class_molar: boolean;
  occlusion_overjet: boolean;
  occlusion_overbite: boolean;
  occlusion_midline_deviation: boolean;
  occlusion_crossbite: boolean;
  appliance_orthodontic: boolean;
  appliance_stayplate: boolean;
  appliance_others: string | null;
  tmd_clenching: boolean;
  tmd_clicking: boolean;
  tmd_trismus: boolean;
  tmd_muscle_spasm: boolean;
  xray_periapical: boolean;
  xray_periapical_tooth_no: string | null;
  xray_panoramic: boolean;
  xray_cephalometric: boolean;
  xray_occlusal: boolean;
  xray_others: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ToothPresence {
  id: string;
  dental_chart_id: string;
  tooth_number: number;
  presence: ToothPresenceStatus;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ToothFinding {
  id: string;
  dental_chart_id: string;
  tooth_number: number;
  category: ToothFindingCategory;
  code: string;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  finding_surfaces?: FindingSurface[];
}

export interface FindingSurface {
  finding_id: string;
  surface: ToothSurface;
}

export interface TreatmentRecord {
  id: string;
  appointment_id: string;
  diagnosis: string | null;
  procedures: string | null;
  clinical_notes: string | null;
  prescriptions: string | null;
  treatment_plan: string | null;
  pause_reason: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  appointment_id: string;
  total_amount: number;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  proof_image_url: string | null;
  recorded_by: string;
  paid_at: string;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  patient_id: string;
  requested_date: string;
  joined_at: string;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

export interface MessengerConversation {
  id: string;
  patient_psid: string;
  status: ConversationStatus;
  taken_over_by: string | null;
  taken_over_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessengerMessage {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  content: string;
  sent_at: string;
  created_at: string;
  is_read: boolean;
}

export interface BookingSession {
  id: string;
  patient_psid: string;
  conversation_id: string;
  step: string;
  collected_date: string | null;
  collected_time: string | null;
  collected_service_id: string | null;
  collected_dentist_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReassignmentLog {
  id: string;
  appointment_id: string;
  original_dentist_id: string;
  new_dentist_id: string;
  original_schedule: string;
  new_schedule: string;
  reason: string;
  staff_id: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> };
      dentists: { Row: Dentist; Insert: Partial<Dentist>; Update: Partial<Dentist> };
      dentist_schedules: { Row: DentistSchedule; Insert: Partial<DentistSchedule>; Update: Partial<DentistSchedule> };
      dentist_blocks: { Row: DentistBlock; Insert: Partial<DentistBlock>; Update: Partial<DentistBlock> };
      clinic_settings: { Row: ClinicSetting; Insert: Partial<ClinicSetting>; Update: Partial<ClinicSetting> };
      clinic_holidays: { Row: ClinicHoliday; Insert: Partial<ClinicHoliday>; Update: Partial<ClinicHoliday> };
      patients: { Row: Patient; Insert: Partial<Patient>; Update: Partial<Patient> };
      patient_medical_records: { Row: PatientMedicalRecord; Insert: Partial<PatientMedicalRecord>; Update: Partial<PatientMedicalRecord> };
      medical_conditions: { Row: MedicalCondition; Insert: Partial<MedicalCondition>; Update: Partial<MedicalCondition> };
      patient_medical_conditions: { Row: PatientMedicalCondition; Insert: Partial<PatientMedicalCondition>; Update: Partial<PatientMedicalCondition> };
      dental_services: { Row: DentalService; Insert: Partial<DentalService>; Update: Partial<DentalService> };
      appointments: { Row: Appointment; Insert: Partial<Appointment>; Update: Partial<Appointment> };
      appointment_services: { Row: AppointmentService; Insert: Partial<AppointmentService>; Update: Partial<AppointmentService> };
      appointment_history: { Row: AppointmentHistory; Insert: Partial<AppointmentHistory>; Update: Partial<AppointmentHistory> };
      qr_codes: { Row: QrCode; Insert: Partial<QrCode>; Update: Partial<QrCode> };
      consent_forms: { Row: ConsentForm; Insert: Partial<ConsentForm>; Update: Partial<ConsentForm> };
      consent_clauses: { Row: ConsentClause; Insert: Partial<ConsentClause>; Update: Partial<ConsentClause> };
      consent_form_clauses: { Row: ConsentFormClause; Insert: Partial<ConsentFormClause>; Update: Partial<ConsentFormClause> };
      dental_charts: { Row: DentalChart; Insert: Partial<DentalChart>; Update: Partial<DentalChart> };
      tooth_presence: { Row: ToothPresence; Insert: Partial<ToothPresence>; Update: Partial<ToothPresence> };
      tooth_findings: { Row: ToothFinding; Insert: Partial<ToothFinding>; Update: Partial<ToothFinding> };
      finding_surfaces: { Row: FindingSurface; Insert: Partial<FindingSurface>; Update: Partial<FindingSurface> };
      treatment_records: { Row: TreatmentRecord; Insert: Partial<TreatmentRecord>; Update: Partial<TreatmentRecord> };
      invoices: { Row: Invoice; Insert: Partial<Invoice>; Update: Partial<Invoice> };
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> };
      waitlist_entries: { Row: WaitlistEntry; Insert: Partial<WaitlistEntry>; Update: Partial<WaitlistEntry> };
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog> };
      messenger_conversations: { Row: MessengerConversation; Insert: Partial<MessengerConversation>; Update: Partial<MessengerConversation> };
      messenger_messages: { Row: MessengerMessage; Insert: Partial<MessengerMessage>; Update: Partial<MessengerMessage> };
      reassignment_logs: { Row: ReassignmentLog; Insert: Partial<ReassignmentLog>; Update: Partial<ReassignmentLog> };
      booking_sessions: { Row: BookingSession; Insert: Partial<BookingSession>; Update: Partial<BookingSession> };
    };
  };
}
