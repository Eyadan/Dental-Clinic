"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { updatePatientAction } from "../actions";
import { Pencil, Phone, Mail, Calendar, AlertTriangle } from "lucide-react";
import type { Patient } from "@/lib/types/database";

interface PatientDetailClientProps {
  patient: Patient;
}

type TabId = "profile" | "medical" | "visits" | "billing";

const TABS: { id: TabId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "medical", label: "Medical History" },
  { id: "visits", label: "Visit History" },
  { id: "billing", label: "Billing" },
];

export function PatientDetailClient({ patient }: PatientDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [editOpen, setEditOpen] = useState(false);

  const fullName = `${patient.first_name} ${patient.last_name}`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
            <Badge variant={patient.is_archived ? "secondary" : "default"}>
              {patient.is_archived ? "Archived" : "Active"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Registered {new Date(patient.created_at).toLocaleDateString("en-PH")}
          </p>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="border-b">
        <nav className="flex gap-4" aria-label="Patient detail tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "profile" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{patient.contact_no}</span>
              </div>
              {patient.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.email}</span>
                </div>
              )}
              {patient.birth_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(patient.birth_date).toLocaleDateString("en-PH")}</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Allergies</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.allergies ? (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <span>{patient.allergies}</span>
                </div>
              ) : (
                <p className="text-muted-foreground">No known allergies</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "medical" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Medical History</CardTitle>
          </CardHeader>
          <CardContent>
            {patient.medical_history ? (
              <p className="whitespace-pre-wrap">{patient.medical_history}</p>
            ) : (
              <p className="text-muted-foreground">No medical history recorded</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "visits" && (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No visit history yet</p>
        </div>
      )}

      {activeTab === "billing" && (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground">No invoices yet</p>
        </div>
      )}

      <PatientFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patient}
        onSubmit={(formData) => updatePatientAction(patient.id, formData)}
      />
    </div>
  );
}
