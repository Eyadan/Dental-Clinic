 
Functional and Non-Functional Requirements
Messenger Booking and Patient Visit Workflow System
 
Prepared for Software Requirements Specification (SRS) documentation
July 31, 2026 — Revision 4
Adds scheduling and dentist calendar configuration, payment lifecycle, treatment pause/resume, record archiving, and a consolidated System Settings module

 


1. Functional Requirements
The functional requirements below describe the system behaviors needed to support the Messenger booking, patient check-in, registration, consultation, electronic consent, treatment, billing, and follow-up workflow, the scheduling and configuration rules it depends on, and the appointment management rules that handle real-world exceptions.
Status Model
Every appointment carries three independent status fields. Booking Status tracks the appointment's lifecycle from request to close. Visit Status applies only once the patient is physically at the clinic, and tracks progress through that day's visit. Payment Status tracks the invoice separately from both. Keeping these separate avoids invalid combinations (e.g., a Cancelled booking with an active Visit Status) and keeps each field's meaning unambiguous.
Booking Status
Status
Purpose
Pending
Booking request submitted through Messenger; awaiting staff review.
Approved
Staff approved the request; appointment is confirmed on the calendar.
Declined
Staff declined the request.
Expired
No staff action was taken within the configured booking approval expiration period.
Confirmed
Patient confirmed attendance via the day-before reminder.
Reschedule Required
Clinic-initiated change (e.g., dentist unavailable); patient must select a new schedule.
Reschedule Requested
Patient asked to move the appointment; awaiting staff processing.
Rescheduled
Appointment has been moved to a new date or time.
Pending Cancellation
Patient requested cancellation through Messenger; awaiting staff confirmation.
Cancelled
Booking has been cancelled and the slot released.
No Show
Patient did not arrive and was not accommodated the same day.
Completed
The visit tied to this booking has finished.

 

Visit Status
Status
Purpose
Checked In
Patient has arrived and been identified or registered.
Waiting
Patient is in the dentist's queue.
Delayed
Patient checked in after the grace period but is still being accommodated that day.
In Consultation
Dentist has called the patient in; examination or consultation underway.
Consent Signed
Patient has signed the visit-specific informed consent form.
Treatment Ongoing
Procedure is actively in progress.
Treatment Paused
Treatment has been paused mid-procedure pending an external requirement.
Awaiting Requirement
Visit is on hold pending an item such as an x-ray, lab result, or specialist clearance.
Resumed
A previously paused treatment has restarted.
Checkout
Treatment is finished and the patient is being billed.
Completed
Treatment and checkout have finished.

 
Payment Status
Status
Purpose
Pending Payment
Invoice generated; no payment recorded yet.
Partially Paid
Some, but not all, of the invoice amount has been paid.
Paid
The invoice has been paid in full.
Payment Failed
An attempted payment (e.g., e-wallet) did not complete successfully.
Refunded
Reserved for future use once refund handling is implemented.

 

1.1 Core Visit Workflow
Sections A–L cover the standard path from booking through checkout, assuming no exceptions occur.
A. Messenger Booking Module
ID
Requirement
FR-01
The system shall allow patients to submit appointment requests through Facebook Messenger.
FR-02
The system shall collect the patient's booking information, including preferred appointment date, preferred time, requested dental service, and basic patient details.
FR-03
The system shall automatically generate a unique appointment reference number for each booking request.
FR-04
The system shall automatically save new booking requests with a Pending status.
FR-05
The system shall display all pending booking requests on the Staff Booking Dashboard.
FR-06
The system shall allow authorized staff to review submitted booking requests.
FR-07
The system shall allow staff to verify dentist availability before approving an appointment.
FR-08
The system shall detect scheduling conflicts with existing appointments.
FR-09
The system shall allow staff to approve or decline booking requests.
FR-10
The system shall update the booking status immediately after a staff decision is made.
FR-11
The system shall automatically send an approval or decline notification to the patient through Facebook Messenger.
FR-12
The system shall automatically add approved appointments to the clinic's appointment calendar.
FR-13
The system shall allow a single booking request to include one or more dental services in the same appointment.
FR-14
The system shall prevent a patient from submitting a new booking request while another request from the same patient is still in Pending status.
FR-15
The system shall allow staff to view the patient's prior Messenger conversation history from the dashboard before approving or declining a booking request.

 
B. Staff Authentication and Access Control
ID
Requirement
FR-16
The system shall require clinic personnel (administrators, reception staff, and dentists) to log in with valid credentials before accessing any system feature.
FR-17
The system shall restrict each user's access to features and records according to their assigned role.

 
C. Patient Check-in and Identification
ID
Requirement
FR-18
The system shall allow staff to check in patients upon arrival at the clinic.
FR-19
The system shall allow staff to identify whether an arriving patient is a new or existing patient.
FR-20
The system shall enable staff to search existing patient records using the patient's name, contact number, appointment reference number, or other identifying information.
FR-21
The system shall allow staff to verify the identity of an existing patient prior to check-in.
FR-22
The system shall allow staff to confirm the details of the patient's scheduled appointment.

 
D. Patient Self-Registration
ID
Requirement
FR-23
The system shall allow staff to generate a temporary patient registration QR code at the reception desk.
FR-24
The system shall set a validity period of five (5) minutes for each generated registration QR code by default, configurable through System Settings.
FR-25
The system shall display the generated QR code for the patient to scan.
FR-26
The system shall open the clinic's secure online registration form when a valid QR code is scanned.
FR-27
The system shall allow new patients to complete the registration form using their own mobile device.
FR-28
The system shall automatically create a new patient record upon successful submission of the registration form.
FR-29
The system shall automatically link the newly created patient record to the corresponding approved appointment.
FR-30
The system shall invalidate a registration QR code immediately after its first successful use, even if the configured validity period has not yet elapsed.
FR-31
The system shall reject any attempt to scan or reuse a registration QR code after it has been used once or after it has expired, whichever occurs first.

 
E. Staff-Assisted Registration
ID
Requirement
FR-32
The system shall allow reception staff to manually register a new patient directly within the clinic management system.
FR-33
The system shall automatically link a manually registered patient record to the corresponding approved appointment.

 
F. Walk-in Patient Visits
ID
Requirement
FR-34
The system shall allow staff to create a walk-in patient visit for a patient who arrives without a prior Messenger booking.
FR-35
The system shall verify that same-day capacity is available before accepting a walk-in visit.
FR-36
The system shall automatically create an Approved appointment record for an accepted walk-in visit and route the patient through the standard new-or-existing patient identification and registration process.
FR-37
The system shall allow a walk-in patient to self-register using the temporary registration QR code under the same rules as a scheduled patient.
FR-38
The system shall place an accepted walk-in patient into the queue according to the same-day time slot assigned to them, following the standard queue ordering rule.
FR-39
The system shall require a walk-in patient to complete the electronic informed consent process before treatment begins, on the same basis as a scheduled patient.

 
G. Queue Management
ID
Requirement
FR-40
The system shall place a verified or newly registered patient into the dentist's waiting queue with a Waiting visit status.
FR-41
The system shall allow staff to check in a patient who arrives before their scheduled appointment time and place them in the queue with a Waiting visit status.
FR-42
The system shall allow the dentist to call an early-arriving patient into the treatment room ahead of their scheduled time if the dentist becomes available.
FR-43
The system shall allow the dentist to call the next patient in the queue.
FR-44
The system shall order the queue by scheduled appointment time first, then by checked-in status, then by earliest arrival time as a tie-breaker among patients scheduled for the same time.
FR-45
The system shall update the patient's visit status (e.g., Waiting, In Consultation, Treatment Ongoing) as the patient progresses through the visit.

 
H. Consultation
ID
Requirement
FR-46
The system shall allow the dentist to access the patient's complete electronic record before beginning the consultation.
FR-47
The system shall display the patient's profile, medical history, allergies, dental chart, previous visits, and appointment details.
FR-48
The system shall allow the dentist to record findings from the initial examination and assessment.
FR-49
The system shall allow the dentist to confirm the treatment or procedure to be performed.

 
I. Electronic Informed Consent
ID
Requirement
FR-50
The system shall automatically generate a visit-specific electronic informed consent form once the treatment plan is confirmed.
FR-51
The system shall display the generated consent form on a tablet for the patient to review.
FR-52
The system shall allow the patient to provide an electronic signature on the consent form using a stylus or touch input.
FR-53
The system shall securely store the signed consent form and link it to the corresponding appointment and treatment record.
FR-54
The system shall record, together with the stored consent, the appointment reference, treatment information, timestamp, consent version, and the identity of the attending staff member or dentist.
FR-55
The system shall prevent the treatment stage from proceeding if the patient does not provide consent, and shall record the decline outcome.
FR-56
The system shall preserve each signed consent exactly as presented at the time of signing, so that later changes to the consent form template do not alter previously signed records.

 
J. Treatment Documentation
ID
Requirement
FR-57
The system shall allow the dentist to update the patient's electronic dental chart during treatment. The dental chart uses a findings-based model: each tooth has a presence status (present, missing, impacted, unerupted) and can have multiple independent findings (conditions, restorations, surgeries), where each finding applies to one or more tooth surfaces (mesial, distal, buccal, lingual, occlusal).
FR-58
The system shall allow the dentist to record clinical notes, diagnosis, procedures performed, prescriptions, and recommended treatment plans.

 
K. Billing and Checkout
ID
Requirement
FR-59
The system shall notify reception staff when a patient's treatment is complete and ready for checkout.
FR-60
The system shall allow staff to generate the patient's bill or invoice.
FR-61
The system shall allow staff to accept payment by cash, GCash, Maya, or card.
FR-62
The system shall allow staff to attach a photo of the proof of payment when the payment method is an e-wallet such as GCash or Maya.
FR-63
The system shall allow staff to record a partial payment against an invoice, leaving the remaining balance outstanding.
FR-64
The system shall record each payment transaction, including amount, method, and resulting payment status, against the corresponding appointment.
FR-65
The system shall assign a payment status of Pending Payment, Partially Paid, Paid, or Payment Failed to each invoice based on the payments recorded against it.

 
L. Follow-up Appointment
ID
Requirement
FR-66
The system shall allow staff to schedule a follow-up appointment when required.
FR-67
The system shall automatically send a follow-up appointment confirmation to the patient through Facebook Messenger.
FR-68
The system shall mark a patient's visit as complete when no follow-up appointment is required, updating both the booking status and visit status to Completed.

 
1.2 Scheduling and Configuration Foundations
Sections M–N define the scheduling rules and dentist/clinic calendar settings that the booking and availability logic in later sections depends on.
M. Advance Booking and Appointment Duration Rules
ID
Requirement
FR-69
The system shall allow administrators to configure the maximum advance booking period, with a default value of thirty (30) calendar days.
FR-70
The system shall prevent patients from requesting an appointment date beyond the configured advance booking period.
FR-71
The system shall allow same-day appointment requests when available capacity remains within the clinic's configured working hours.
FR-72
The system shall assign each dental service a default treatment duration.
FR-73
The system shall automatically calculate an appointment's total duration as the sum of the default durations of all selected services.
FR-74
The system shall allow authorized staff to manually override the calculated appointment duration.
FR-75
The system shall prevent an appointment from being created or approved when insufficient time remains before clinic closing to accommodate its calculated duration.

 
N. Dentist and Clinic Schedule Configuration
ID
Requirement
FR-76
The system shall allow each dentist to configure their own working days, including which days of the week they are available.
FR-77
The system shall allow each dentist to configure their own working hours independently of other dentists.
FR-78
The system shall allow each dentist to configure recurring lunch or break periods during which they are unavailable.
FR-79
The system shall allow each dentist to block specific vacation dates during which they are unavailable.
FR-80
The system shall allow each dentist to configure recurring unavailable schedules (e.g., a weekly seminar day).
FR-81
The system shall allow administrators to configure clinic-wide holidays and special closures during which no appointments may be booked.
FR-82
The system shall allow administrators to configure half-day operating schedules for specific dates.

 
1.3 Appointment Management and Exception Rules
Sections O–W handle the situations that fall outside the standard path — dentist unavailability, late or missed arrivals, freed-up capacity, unresolved requests, and patient-initiated changes — so the core workflow above can stay simple.
O. Appointment Confirmation Reminder
ID
Requirement
FR-83
The system shall automatically send a Messenger confirmation reminder to the patient before their scheduled appointment, using a reminder schedule (e.g., one day before) configured in System Settings.
FR-84
The reminder shall allow the patient to select Confirm, Reschedule, or Cancel directly within Messenger.
FR-85
If the patient selects Confirm, the system shall update the booking status to Confirmed.
FR-86
If the patient selects Reschedule, the system shall update the booking status to Reschedule Requested and route the request to staff for processing.
FR-87
If the patient selects Cancel, the system shall create a cancellation entry with a Pending Cancellation status for staff review, consistent with the standard cancellation process.
FR-88
If the patient does not respond to the reminder, the system shall flag the appointment for staff review rather than automatically cancelling it.
FR-89
If a reminder cannot be delivered automatically because of Messenger Platform policy restrictions, the system shall follow the general Messenger notification fallback rule.

 
P. Messenger Notification Reliability
ID
Requirement
FR-90
If Messenger Platform policy restrictions (e.g., messaging-window limitations) prevent an automated notification from being delivered, the system shall create a pending staff notification so authorized personnel can manually contact the patient.
FR-91
The system shall apply this fallback rule to all automated Messenger notifications, including booking decisions, reminders, reassignment notices, cancellation confirmations, and reschedule confirmations.

 
Q. Dentist Unavailability and Reassignment
ID
Requirement
FR-92
The system shall allow authorized dentists and reception staff to declare a dentist as temporarily unavailable for a specified date and time range. 
FR-93
The system shall display all of that dentist's affected appointments for the affected period once the dentist is marked unavailable.
FR-94
The system shall update each affected appointment's booking status to Reschedule Required and automatically notify the patient through Messenger.
FR-95
The system shall suggest available alternate dentists for each affected appointment when more than one dentist is registered in the system.
FR-96
The system shall require staff to manually confirm the reassignment of an affected appointment before it is applied.
FR-97
If no alternate dentist is available — including clinics with only one registered dentist — the system shall prompt staff to reschedule the affected appointment instead of offering a reassignment option.
FR-98
Once a new schedule is confirmed, the system shall update the appointment's booking status to Rescheduled and notify the patient through Messenger.
FR-99
If an affected patient does not respond to the reschedule notice within 24 hours, the system shall flag the appointment for staff follow-up.


FR-147
The system shall allow a dentist to declare an emergency or unavailability through the Dentist Mobile Portal.
FR-148
The system shall allow authorized reception staff to manually mark a dentist as unavailable through the system.
FR-149
The system shall activate an emergency or unavailability event when a dentist declares an emergency or authorized staff marks the dentist as unavailable.
FR-150
The system shall identify all appointments affected by the dentist's emergency or unavailability based on the affected date and time period.
FR-151
The system shall display the affected appointments to authorized reception staff for review and rescheduling.
FR-152
The system shall automatically update the booking status of each affected appointment to Reschedule Required.
FR-153
The system shall automatically send a Messenger notification to each affected patient informing them that their appointment requires rescheduling.(Limited)
FR-154
The system shall identify and display available alternate dentists who can accommodate an affected appointment based on their configured schedules and availability.
FR-155
The system shall allow authorized staff to reassign an affected patient to an available alternate dentist.
FR-156
The system shall require staff confirmation before an affected appointment is reassigned to an alternate dentist.
FR-157
If no alternate dentist is available, the system shall allow the patient to select a preferred new appointment schedule.
FR-158
The system shall allow the patient to select an available replacement date and time through the provided rescheduling process.
FR-159
The system shall verify the availability of the selected alternate dentist, date, and time before confirming the reassignment or rescheduled appointment.
FR-160
The system shall update the appointment calendar after an affected appointment has been reassigned or rescheduled.
FR-161
The system shall update the booking status to Rescheduled when a new appointment schedule has been successfully confirmed.
FR-162
The system shall update the booking status to Confirmed when the reassigned appointment has been confirmed according to the clinic's confirmation process.
FR-163
The system shall automatically notify the patient through Messenger after an alternate dentist or new appointment schedule has been confirmed.(Limited)
FR-164
The system shall record the original dentist, replacement dentist, original appointment schedule, replacement schedule, reason for change, and staff member responsible for the reassignment or rescheduling.
FR-165
If the affected patient does not respond to the rescheduling notification within the configured follow-up period, the system shall flag the appointment for staff follow-up.
FR-166
The system shall prevent an affected appointment from being assigned to an unavailable dentist or an already occupied time slot.
FR-167
The system shall release the original appointment time slot when the appointment has been successfully reassigned or rescheduled.
FR-168
The system shall maintain the original appointment history while recording the new dentist, date, time, and rescheduling information.

1.7 Live Chat and AI Handoff
Section AA covers reception staff’s ability to take over a patient’s Messenger conversation from the automated booking bot and hand it back once resolved.
AA. Live Chat & AI Handoff (Staff Takeover)
ID
Requirement
FR-169
The system shall allow authorized reception staff to view all active patient Messenger inquiries on the Staff Live Chat Dashboard.
FR-170
The system shall allow reception staff to manually take over an active conversation from the automated bot/AI (“Take Chat”).
FR-171
Upon staff takeover, the system shall automatically pause all automated bot replies for that patient to prevent AI interference during human chat.
FR-172
The system shall allow reception staff to send real-time messages directly to the patient’s Facebook Messenger inbox from the dashboard.
FR-173
The system shall allow reception staff to end a takeover session (“End Chat”), restoring automated bot functionality for the patient.


R. Late Arrival and No-Show Handling
ID
Requirement
FR-100
The system shall allow an administrator to configure the late-arrival grace period, in minutes, through the System Settings module.
FR-101
The system shall flag an appointment as Delayed once the configured grace period has elapsed without patient check-in, while same-day accommodation remains possible.
FR-102
The system shall allow staff to call the next queued patient ahead of a Delayed patient.
FR-103
The system shall allow staff to move a Delayed patient to another available slot later the same day.
FR-104
The system shall allow staff to reschedule a Delayed patient to another day if no same-day slot is available.
FR-105
The system shall allow staff to mark an appointment as No Show if the patient does not arrive and is not accommodated the same day.
FR-106
The system shall still allow a late patient to check in and be added to the end of the current queue if they arrive before being marked No Show.

 
S. Same-Day and Dynamic Availability Management
ID
Requirement
FR-107
The system shall continuously track a dentist's real-time available time within configured working hours.
FR-108
The system shall automatically recalculate and release available time slots when an appointment is completed ahead of its allocated time, cancelled, or marked No Show.
FR-109
The system shall make newly released time slots immediately visible to the Messenger booking flow and the Staff Booking Dashboard.
FR-110
The system shall allow staff to accept walk-in patients or open same-day slots for booking when capacity remains before closing time.
FR-111
The system shall allow staff to maintain a waitlist of patients requesting earlier availability.
FR-112
The system shall notify waitlisted patients in the order they joined the waitlist (first-come, first-served) when a same-day slot becomes available.

 
T. Booking Approval Expiration
ID
Requirement
FR-113
The system shall allow administrators to configure a booking approval expiration period through the System Settings module, with a default value of forty-eight (48) hours.
FR-114
The system shall automatically update a booking's status to Expired if staff have not approved or declined it within the configured expiration period.
FR-115
The system shall notify the patient through Messenger when their booking request has expired.

 
U. Patient-Initiated Cancellation
ID
Requirement
FR-116
The system shall allow patients to request cancellation of an approved appointment through Facebook Messenger.
FR-117
Upon a cancellation request, the system shall create a cancellation entry with a Pending Cancellation status and display it on the Staff Booking Dashboard for review.
FR-118
The system shall allow staff to capture a cancellation reason (e.g., patient request, emergency, illness, transportation, scheduling conflict, dentist unavailable, or other) when processing a cancellation request.
FR-119
The system shall allow staff to confirm or deny a cancellation request.
FR-120
Upon staff confirmation, the system shall update the appointment's booking status to Cancelled and release the corresponding slot for rebooking.
FR-121
The system shall automatically send a Messenger notification to the patient confirming the outcome of their cancellation request.
FR-122
The system shall allow administrators to configure a cancellation cutoff period (e.g., a minimum number of minutes before the appointment) through the System Settings module.
FR-123
The system shall prevent a patient from submitting a cancellation request once the configured cutoff period has passed, and shall direct the patient to contact the clinic directly instead.

 
V. Patient-Initiated Reschedule
ID
Requirement
FR-124
The system shall allow patients to request a schedule change for an approved appointment through Facebook Messenger.
FR-125
Upon a reschedule request, the system shall update the appointment's booking status to Reschedule Requested and display it on the Staff Booking Dashboard for review.
FR-126
The system shall allow staff to view available time slots when processing a reschedule request.
FR-127
The system shall allow staff to select and confirm a new date and time for the appointment.
FR-128
Upon confirmation, the system shall update the appointment's booking status to Rescheduled and release the original time slot.
FR-129
The system shall automatically send a Messenger notification to the patient confirming the new appointment date and time.

 
W. Audit and Activity Logging
ID
Requirement
FR-130
The system shall record user activities, including booking approvals or declines, patient registration, consent signing, treatment updates, billing transactions, dentist reassignments, appointment cancellations, and appointment reschedules.
FR-131
The system shall record system-generated events, including confirmation reminders sent, automatic slot releases, and appointments flagged for staff follow-up.
FR-132
The system shall record a timestamp and user identification for each logged activity.

 
1.4 Treatment Continuity
Section X allows a single treatment episode to span more than one physical visit without being recreated as a separate appointment.
X. Treatment Pause and Resume
ID
Requirement
FR-133
The system shall allow the dentist to pause an ongoing treatment and record a reason (e.g., awaiting x-ray, laboratory result, specialist clearance, or patient availability).
FR-134
The system shall update the visit status to Treatment Paused, and then to Awaiting Requirement, when a treatment is paused pending an external requirement.
FR-135
The system shall allow staff to resume a paused treatment under the same appointment and treatment record once the required item is available, without creating a duplicate appointment.
FR-136
The system shall update the visit status to Resumed and then back to Treatment Ongoing when a paused treatment is resumed.

 
1.5 Records and Data Governance
Section Y governs how patient, appointment, and financial records are retained over time.
Y. Record Archiving and Appointment History
ID
Requirement
FR-137
The system shall archive rather than permanently delete patient records, appointments, invoices, and consent forms when staff remove them from active use.
FR-138
The system shall exclude archived records from standard active views while keeping them retrievable for authorized review.
FR-139
The system shall maintain a complete history of all appointments, treatments, and visits linked to a single patient record over time, without overwriting prior visit data.

 
1.6 System Settings and Configuration
Section Z consolidates the configurable parameters referenced throughout this document into a single administrative module.
Z. System Settings Module
ID
Requirement
FR-140
The system shall provide a System Settings module for administrators to manage clinic-wide configuration, organized into Clinic, Dentist, Appointment, Messenger, Payment, and Security categories.
FR-141
Clinic settings shall include working days, holidays, special closures, and half-day schedules.
FR-142
Dentist settings shall include working schedules, lunch breaks, vacation periods, and recurring unavailable schedules.
FR-143
Appointment settings shall include the maximum advance booking period, late-arrival grace period, booking approval expiration, QR code validity, cancellation cutoff, reminder schedule, waitlist policy, and walk-in policy.
FR-144
Messenger settings shall include message templates, automatic notification triggers, and the staff notification fallback and retry behavior.
FR-145
Payment settings shall include accepted payment methods and partial payment policy.
FR-146
Security settings shall include password policy, session timeout, and audit log retention period.

 

 
2. Non-Functional Requirements
The non-functional requirements below define the quality attributes and operating constraints the system must satisfy, organized by category.
1. Performance
ID
Requirement
NFR-01
The system shall load dashboard pages within 3 seconds under normal operating conditions.
NFR-02
The system shall record a Messenger booking request within 5 seconds of submission.
NFR-03
The system shall generate a registration QR code within 2 seconds of the request.
NFR-04
The system shall return patient record search results within 3 seconds.
NFR-05
The system shall display the electronic consent form within 2 seconds of being generated.
NFR-06
The system shall display a dentist's affected appointments for reassignment within 3 seconds of the dentist being marked unavailable.
NFR-07
The system shall process a staff-confirmed cancellation and release the corresponding slot within 5 seconds.
NFR-08
The system shall propagate a newly released time slot to the Messenger booking flow and the Staff Booking Dashboard within 5 seconds of the triggering event (early completion, cancellation, or no-show).

 
2. Availability
ID
Requirement
NFR-09
The system shall maintain at least 99.5% uptime, excluding scheduled maintenance windows.
NFR-10
The system shall automatically recover normal operation after a temporary network interruption.

 
3. Security
ID
Requirement
NFR-11
The system shall require authenticated login credentials for all clinic personnel before granting system access.
NFR-12
The system shall enforce Role-Based Access Control (RBAC) so that users can only access features and records permitted by their assigned role.
NFR-13
The system shall encrypt all data transmitted between client devices and the server using HTTPS/TLS.
NFR-14
The system shall encrypt patient personal information, medical records, appointment details, and consent forms stored in the database.
NFR-15
The system shall reject any attempt to use a registration QR code that has expired or was already used.
NFR-16
The system shall protect audit logs from modification or deletion by any user, including administrators, and shall retain them for a period defined by clinic policy.
NFR-17
The system shall comply with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173) in the collection, processing, storage, and protection of patient personal and medical information.
NFR-18
The system shall enforce a configurable password policy and session timeout period for all user accounts.

 
4. Reliability
ID
Requirement
NFR-19
The system shall preserve data consistency and integrity in the event of a system failure or unexpected interruption.
NFR-20
The underlying database shall support ACID (Atomicity, Consistency, Isolation, Durability) transaction properties.
NFR-21
The system shall prevent duplicate patient records and duplicate appointment entries through validation and uniqueness checks.
NFR-22
The system shall automatically back up critical patient and appointment data at scheduled intervals.
NFR-23
The system shall ensure a booking status and its associated visit status remain in a valid combination at all times (e.g., a Cancelled booking cannot carry an active visit status).
NFR-24
The system shall use transactional locking or an equivalent atomic mechanism when approving a booking, to prevent two conflicting appointments from being approved for the same dentist and time slot simultaneously.
NFR-25
The system shall use optimistic concurrency control for simultaneous edits to a patient's medical record, detecting conflicting updates and prompting the user to refresh before reapplying changes.

 
5. Scalability
ID
Requirement
NFR-26
The system shall support multiple reception staff and dentists working concurrently without significant performance degradation.
NFR-27
The system shall efficiently accommodate a growing volume of patient records, appointments, treatment histories, and consent documents.
NFR-28
The system architecture shall be extensible to support future clinic branches and additional modules.
NFR-29
The data model shall support associating a single dentist with more than one clinic branch to support future multi-branch expansion.

 
6. Usability
ID
Requirement
NFR-30
The system shall provide a responsive interface that functions correctly on desktop computers, tablets, and smartphones.
NFR-31
The self-registration form shall be designed so a typical patient can complete it within approximately three (3) minutes, leaving a buffer before the QR code expiry.
NFR-32
The interface shall use clear navigation and minimize the number of steps required to complete booking, registration, consultation, billing, and follow-up tasks.
NFR-33
The system shall display clear, specific error messages and validation prompts to help users correct invalid or incomplete input.
NFR-34
The confirmation reminder shall allow the patient to respond with a single tap directly in Messenger, without requiring login or a separate form.

 
7. Maintainability
ID
Requirement
NFR-35
The system shall be built using a modular architecture to simplify maintenance, testing, and future enhancements.
NFR-36
The source code shall follow established software engineering principles, including SOLID, DRY, and KISS.
NFR-37
The database schema shall conform to at least Third Normal Form (3NF) to reduce redundancy and maintain consistency.
NFR-38
The system shall maintain detailed error logs to assist developers in diagnosing and resolving issues.

 
8. Compatibility
ID
Requirement
NFR-39
The system shall integrate with the Facebook Messenger Platform API to receive booking requests and send notifications.
NFR-40
The system shall support current versions of major web browsers, including Chrome, Edge, Firefox, and Safari.
NFR-41
The system shall support touch-enabled tablets for displaying and capturing electronic consent signatures.
NFR-42
The system shall support patient self-registration via QR code on mobile devices without requiring app installation.
NFR-43
The system shall be deployable on cloud-hosted infrastructure with secure internet access for authorized personnel.

 
9. Dentist Emergency and Rescheduling Performance
ID
Requirement
NFR-44
The system shall activate a dentist emergency or unavailability event within 5 seconds after the event is submitted by the dentist or authorized staff.
NFR-45
The system shall identify and display all affected appointments within 3 seconds after a dentist is marked unavailable.
NFR-46
The system shall display available alternate dentists and applicable appointment schedules within 3 seconds of a rescheduling request.
NFR-47
The system shall update the appointment calendar within 5 seconds after an appointment has been successfully reassigned or rescheduled.
NFR-48
The system shall record emergency, reassignment, and rescheduling transactions without losing previously stored appointment information.

10. Emergency Rescheduling Reliability
ID
Requirement
NFR-49
The system shall ensure that an appointment affected by dentist unavailability cannot remain assigned to an unavailable dentist after the emergency event has been successfully processed.
NFR-50
The system shall prevent simultaneous reassignment of the same appointment to multiple dentists or schedules.
NFR-51
The system shall prevent two patients from being assigned to the same dentist and time slot during emergency rescheduling.
NFR-52
The system shall preserve the original appointment information when a booking is reassigned or rescheduled.
NFR-53
The system shall automatically retry or create a staff follow-up notification when a Messenger rescheduling notification cannot be delivered.

11. Security and Access Control
ID
Requirement
NFR-54
The system shall require authentication before a dentist or reception staff member can declare, activate, or manage dentist unavailability.(optional)
NFR-55
The system shall restrict dentist emergency declaration and appointment reassignment functions according to the user's assigned role.
NFR-56
The system shall record the identity of the dentist or staff member who initiated the emergency or unavailability event.
NFR-57
The system shall record an immutable audit trail of emergency declarations, affected appointments, reassignment decisions, rescheduling actions, and notifications.
NFR-58
The system shall protect patient information displayed during the emergency rescheduling process using the same security controls applied to other patient records.

12. Usability
ID
Requirement
NFR-59
The Dentist Mobile Portal shall provide a clear and easily accessible emergency declaration function.
NFR-60
The system shall clearly identify affected appointments and their current rescheduling status to authorized staff.
NFR-61
The system shall clearly distinguish between available and unavailable alternate dentists when presenting reassignment options.
NFR-62
The patient rescheduling interface shall allow the patient to select an available replacement schedule with minimal steps.
NFR-63
The system shall display clear confirmation messages after an appointment has been reassigned or rescheduled.
NFR-64
The system shall display clear error messages when no alternate dentist or available appointment schedule is found.


