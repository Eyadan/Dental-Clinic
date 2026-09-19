# Messenger In-App Booking Webview Implementation Guide

## Overview
This document preserves the complete design, code, and integration steps for the Facebook Messenger In-App Booking Webview. This allows patients chatting with the clinic's Facebook Page to open an interactive, visual booking interface (service selection, date/time pickers, dentist preference) directly inside Messenger without leaving the chat thread.

---

## 1. Architecture and User Flow

1. **Trigger**:
   - Patient types "book" or taps a persistent menu option in Messenger.
   - The clinic's webhook responds with a Facebook Button Template containing a `web_url` button.
2. **Modal Sheet Presentation**:
   - The button uses `webview_height_ratio: "tall"` and `messenger_extensions: true`.
   - Messenger opens `https://<APP_URL>/booking-webview?psid=<USER_PSID>` as a native sliding modal sheet covering ~75% of the mobile screen.
3. **Interactive UI**:
   - Patient details pre-fill if their `messenger_psid` already exists in the `patients` table.
   - Services are selected with dynamic duration and pricing calculations from `dental_services`.
   - Date and time pickers allow instant slot selection.
4. **Submission and Auto-Close**:
   - Tapping "Confirm Appointment Request" creates the record in `appointments` and links junction rows in `appointment_services`.
   - The webview invokes `window.MessengerExtensions.requestCloseBrowser()`.
   - The modal automatically slides down and returns the patient to the conversation.
   - A Messenger confirmation message is sent to the patient with their booking reference number.

---

## 2. Meta Messenger Platform Setup

1. **Domain Whitelisting**:
   - Go to Meta for Developers > Select App > Messenger > Settings (or Page Settings > Advanced Messaging).
   - Under **Whitelisted Domains**, add:
     - Production: `https://<your-production-domain>`
     - Local Dev: `https://<ngrok-or-localtunnel-domain>`
2. **Bot Message Payload (Button Template)**:
   ```json
   {
     "recipient": { "id": "<PATIENT_PSID>" },
     "message": {
       "attachment": {
         "type": "template",
         "payload": {
           "template_type": "button",
           "text": "Tap below to select your dental services and preferred schedule:",
           "buttons": [
             {
               "type": "web_url",
               "url": "https://<your-domain>/booking-webview?psid=" + psid,
               "title": "Book Appointment",
               "webview_height_ratio": "tall",
               "messenger_extensions": true
             }
           ]
         }
       }
     }
   }
   ```

---

## 3. Middleware Exemption

In `src/middleware.ts`, ensure `"/booking-webview"` is included in `PUBLIC_ROUTES` so Facebook Messenger users can access it without a clinic staff session:

```typescript
const PUBLIC_ROUTES = ["/login", "/auth/callback", "/booking-webview"];
```

---

## 4. File Implementations

### A. Page Route (`src/app/(public)/booking-webview/page.tsx`)
```tsx
import { Suspense } from "react";
import { BookingWebviewClient } from "./booking-webview-client";

export const metadata = {
  title: "Book Appointment | Smile Dental Clinic",
  description: "Interactive Messenger In-App Booking Form for Patients",
};

export default function BookingWebviewPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading booking form...</div>}>
        <BookingWebviewClient />
      </Suspense>
    </main>
  );
}
```

### B. Server Actions (`src/app/(public)/booking-webview/actions.ts`)
- Database tables used:
  - `dental_services` (`id, name, default_price, default_duration_minutes, is_active`)
  - `dentists` (`id, specialization, is_active, users!inner(first_name, last_name)`)
  - `patients` (`id, first_name, last_name, contact_no, messenger_psid`)
  - `appointments` (`reference_no, patient_id, dentist_id, booking_status, payment_status, scheduled_date, scheduled_time, total_duration, is_archived`)
  - `appointment_services` (`appointment_id, service_id, price`)

```typescript
"use server";

import { createClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/services/notification-service";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";

function getServiceClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for booking webview actions");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export interface WebviewService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export interface WebviewDentist {
  id: string;
  name: string;
  specialization?: string;
}

export async function getWebviewBookingDataAction(psid?: string) {
  try {
    const supabase = getServiceClient();

    const { data: servicesData } = await supabase
      .from("dental_services")
      .select("id, name, default_price, default_duration_minutes")
      .eq("is_active", true)
      .order("name", { ascending: true });

    const { data: dentistsData } = await supabase
      .from("dentists")
      .select("id, specialization, is_active, users!inner(first_name, last_name)")
      .eq("is_active", true);

    const services: WebviewService[] = (servicesData ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      price: Number(s.default_price ?? 0),
      duration_minutes: s.default_duration_minutes ?? 30,
    }));

    const dentists: WebviewDentist[] = (dentistsData ?? []).map((d) => {
      const u = Array.isArray(d.users) ? d.users[0] : d.users;
      return {
        id: d.id,
        name: `Dr. ${u.first_name} ${u.last_name}`,
        specialization: d.specialization ?? undefined,
      };
    });

    let patientInfo: { name: string; phone: string } | null = null;
    if (psid) {
      const { data: existingPatient } = await supabase
        .from("patients")
        .select("first_name, last_name, contact_no")
        .eq("messenger_psid", psid)
        .maybeSingle();

      if (existingPatient) {
        patientInfo = {
          name: `${existingPatient.first_name} ${existingPatient.last_name}`.trim(),
          phone: existingPatient.contact_no ?? "",
        };
      }
    }

    return {
      success: true,
      data: { services, dentists, patientInfo },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load booking options",
    };
  }
}

export interface SubmitWebviewBookingInput {
  psid?: string;
  patientName: string;
  patientPhone: string;
  serviceIds: string[];
  scheduledDate: string;
  scheduledTime: string;
  dentistId?: string;
}

export async function submitWebviewBookingAction(input: SubmitWebviewBookingInput) {
  try {
    const supabase = getServiceClient();

    if (!input.patientName.trim()) return { success: false, error: "Please enter your full name." };
    if (!input.patientPhone.trim()) return { success: false, error: "Please enter your contact phone number." };
    if (!input.serviceIds.length) return { success: false, error: "Please select at least one dental service." };
    if (!input.scheduledDate) return { success: false, error: "Please select an appointment date." };
    if (!input.scheduledTime) return { success: false, error: "Please select an appointment time slot." };

    const { data: services } = await supabase
      .from("dental_services")
      .select("id, name, default_duration_minutes, default_price")
      .in("id", input.serviceIds);

    if (!services || services.length === 0) return { success: false, error: "Selected services could not be verified." };

    const primaryService = services[0]?.name ?? "Dental Consultation";
    const totalDuration = services.reduce((acc, s) => acc + (s.default_duration_minutes ?? 30), 0);
    const priceMap = new Map(services.map((s) => [s.id, Number(s.default_price ?? 0)]));

    let assignedDentistId = input.dentistId;
    if (!assignedDentistId) {
      const { data: firstDentist } = await supabase
        .from("dentists")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .single();
      assignedDentistId = firstDentist?.id;
    }

    if (!assignedDentistId) return { success: false, error: "No active dentist found." };

    const nameParts = input.patientName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Patient";
    const lastName = nameParts.slice(1).join(" ") || "Unknown";

    let patientId: string | null = null;
    if (input.psid) {
      const { data: existing } = await supabase
        .from("patients")
        .select("id")
        .eq("messenger_psid", input.psid)
        .maybeSingle();

      if (existing) {
        patientId = existing.id;
        await supabase
          .from("patients")
          .update({ first_name: firstName, last_name: lastName, contact_no: input.patientPhone.trim() })
          .eq("id", patientId);
      }
    }

    if (!patientId) {
      const { data: newPatient } = await supabase
        .from("patients")
        .insert({
          first_name: firstName,
          last_name: lastName,
          contact_no: input.patientPhone.trim(),
          messenger_psid: input.psid ?? null,
        })
        .select("id")
        .single();

      patientId = newPatient?.id ?? null;
    }

    if (!patientId) return { success: false, error: "Could not register patient record." };

    const refNo = `MB-${Date.now().toString(36).toUpperCase()}`;

    const { data: newAppointment, error: apptError } = await supabase
      .from("appointments")
      .insert({
        reference_no: refNo,
        patient_id: patientId,
        dentist_id: assignedDentistId,
        booking_status: "pending",
        payment_status: "pending_payment",
        scheduled_date: input.scheduledDate,
        scheduled_time: input.scheduledTime,
        total_duration: totalDuration,
        is_archived: false,
      })
      .select("id, reference_no")
      .single();

    if (apptError || !newAppointment) return { success: false, error: "Failed to save appointment request." };

    const apptServices = input.serviceIds.map((sId) => ({
      appointment_id: newAppointment.id,
      service_id: sId,
      price: priceMap.get(sId) ?? 0,
    }));
    await supabase.from("appointment_services").insert(apptServices);

    if (input.psid) {
      await sendNotification({
        type: "custom",
        patientPsid: input.psid,
        customMessage:
          "Booking Request Received!\n\n" +
          "Reference: " + newAppointment.reference_no + "\n" +
          "Date: " + input.scheduledDate + "\n" +
          "Time: " + input.scheduledTime + "\n" +
          "Service: " + primaryService + "\n\n" +
          "Your appointment request is pending clinic approval.",
      });
    }

    return {
      success: true,
      data: {
        referenceNo: newAppointment.reference_no,
        date: input.scheduledDate,
        time: input.scheduledTime,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to process booking submission" };
  }
}
```

### C. Client Component (`src/app/(public)/booking-webview/booking-webview-client.tsx`)
Features:
- Messenger Extensions script loaded via `next/script` (`//connect.facebook.net/en_US/messenger.Extensions.js`).
- Auto-closing with `window.MessengerExtensions.requestCloseBrowser()`.
- Dynamic total calculation for multi-selected services.
- Accessible form controls using `DatePicker` and `TimePicker`.
