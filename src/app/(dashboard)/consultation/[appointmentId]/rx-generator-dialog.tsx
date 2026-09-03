"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  Loader2,
  Check,
  Stethoscope,
  X,
  Pill,
} from "lucide-react";
import { RX_PRESET_TEMPLATES, type RxPresetMedication } from "./rx-preset-templates";
import { createPrescriptionAction } from "./rx-actions";
import type { PrescriptionData, PrescriptionItemData } from "./rx-types";

interface RxGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  patientId: string;
  patientName: string;
  dentistName: string;
  onPrescriptionCreated?: () => void;
}

export function RxGeneratorDialog({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  patientName,
  dentistName,
  onPrescriptionCreated,
}: RxGeneratorDialogProps) {
  const [activeTab, setActiveTab] = useState<"compose" | "preview">("compose");
  const [ptrNo, setPtrNo] = useState("");
  const [s2LicenseNo, setS2LicenseNo] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [items, setItems] = useState<Omit<PrescriptionItemData, "id">[]>([
    {
      medicationName: "Amoxicillin 500mg Capsule",
      genericName: "Amoxicillin",
      dosage: "1 capsule 3x daily (every 8 hours)",
      duration: "7 days",
      quantity: 21,
      instructions: "Take after meals. Complete full 7-day course.",
    },
  ]);

  const handleAddPreset = (preset: RxPresetMedication) => {
    setItems((prev) => [
      ...prev,
      {
        medicationName: preset.medicationName,
        genericName: preset.genericName,
        dosage: preset.dosage,
        duration: preset.duration,
        quantity: preset.quantity,
        instructions: preset.instructions,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof Omit<PrescriptionItemData, "id">, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddBlankItem = () => {
    setItems((prev) => [
      ...prev,
      {
        medicationName: "",
        genericName: "",
        dosage: "",
        duration: "",
        quantity: 1,
        instructions: "",
      },
    ]);
  };

  const handleSavePrescription = async () => {
    const validItems = items.filter((i) => i.medicationName.trim().length > 0);
    if (validItems.length === 0) {
      setError("Please add at least one medication with a valid name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await createPrescriptionAction(
        appointmentId,
        patientId,
        ptrNo,
        s2LicenseNo,
        notes,
        validItems,
      );
      if (res.success) {
        setSuccess("Prescription recorded successfully.");
        if (onPrescriptionCreated) onPrescriptionCreated();
        setActiveTab("preview");
      } else {
        setError(res.error ?? "Failed to save prescription");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Pill className="h-5 w-5 text-cyan-600" />
            Dental RX Prescription Generator
          </DialogTitle>

          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
            <Button
              size="sm"
              variant={activeTab === "compose" ? "default" : "ghost"}
              onClick={() => setActiveTab("compose")}
              className={`h-7 text-xs rounded-lg px-3 font-semibold ${
                activeTab === "compose" ? "bg-cyan-600 text-white shadow-2xs" : ""
              }`}
            >
              Compose RX
            </Button>
            <Button
              size="sm"
              variant={activeTab === "preview" ? "default" : "ghost"}
              onClick={() => setActiveTab("preview")}
              className={`h-7 text-xs rounded-lg px-3 font-semibold ${
                activeTab === "preview" ? "bg-cyan-600 text-white shadow-2xs" : ""
              }`}
            >
              ℞ Official RX Pad Preview
            </Button>
          </div>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="rounded-xl border-red-500/20 bg-red-500/5">
            <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
            <AlertDescription className="text-xs font-semibold flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> {success}
            </AlertDescription>
          </Alert>
        )}

        {activeTab === "compose" ? (
          <div className="space-y-4 text-xs">
            {/* DENTAL PRESETS SELECTOR */}
            <div className="p-3.5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 space-y-2">
              <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-600" /> Quick-Pick Dental Prescription Presets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {RX_PRESET_TEMPLATES.map((tmpl) => (
                  <Button
                    key={tmpl.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddPreset(tmpl)}
                    className="h-7 text-[10px] border-cyan-500/30 bg-card hover:bg-cyan-500/10 text-foreground font-medium rounded-lg"
                  >
                    + {tmpl.medicationName}
                  </Button>
                ))}
              </div>
            </div>

            {/* DENTIST CREDENTIALS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-border/70 bg-muted/20">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">PTR Number (Optional)</Label>
                <Input
                  placeholder="e.g., PTR #1234567"
                  value={ptrNo}
                  onChange={(e) => setPtrNo(e.target.value)}
                  className="h-8 text-xs border-border/80 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">S2 License Number (Optional)</Label>
                <Input
                  placeholder="e.g., S2 #9876543"
                  value={s2LicenseNo}
                  onChange={(e) => setS2LicenseNo(e.target.value)}
                  className="h-8 text-xs border-border/80 rounded-xl"
                />
              </div>
            </div>

            {/* MEDICATION LINE ITEMS */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Prescribed Medications ({items.length})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBlankItem}
                  className="h-7 text-[11px] border-border rounded-lg"
                >
                  <Plus className="mr-1 h-3 w-3" /> Add Custom Medication
                </Button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-border/70 bg-card space-y-2 relative">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold font-mono text-cyan-600 bg-cyan-500/10 px-2 py-0.5 rounded-md">
                      Item #{idx + 1}
                    </span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(idx)}
                        className="h-6 w-6 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground font-semibold">Medication & Strength *</Label>
                      <Input
                        placeholder="e.g., Amoxicillin 500mg Capsule"
                        value={item.medicationName}
                        onChange={(e) => handleItemChange(idx, "medicationName", e.target.value)}
                        className="h-8 text-xs border-border/80 rounded-lg"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground font-semibold">Dosage / Frequency *</Label>
                      <Input
                        placeholder="e.g., 1 cap 3x daily every 8 hours"
                        value={item.dosage}
                        onChange={(e) => handleItemChange(idx, "dosage", e.target.value)}
                        className="h-8 text-xs border-border/80 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground font-semibold">Duration *</Label>
                      <Input
                        placeholder="e.g., 7 days"
                        value={item.duration}
                        onChange={(e) => handleItemChange(idx, "duration", e.target.value)}
                        className="h-8 text-xs border-border/80 rounded-lg"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground font-semibold">Quantity (# Units) *</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="e.g., 21"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", parseInt(e.target.value) || 1)}
                        className="h-8 text-xs border-border/80 rounded-lg font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground font-semibold">Instructions / Sig</Label>
                      <Input
                        placeholder="e.g., Take after meals"
                        value={item.instructions || ""}
                        onChange={(e) => handleItemChange(idx, "instructions", e.target.value)}
                        className="h-8 text-xs border-border/80 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* SPECIAL CLINICAL INSTRUCTIONS */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Special Clinical Notes & Advice</Label>
              <Textarea
                placeholder="e.g., Discontinue if severe allergic rash or gastric irritation occurs. Follow up in 7 days."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-16 text-xs border-border/80 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 rounded-xl text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSavePrescription}
                disabled={isSubmitting}
                className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save & Generate RX Pad"}
              </Button>
            </div>
          </div>
        ) : (
          /* OFFICIAL MEDICAL RX PAD PREVIEW & PRINT TAB */
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                onClick={handlePrint}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Official RX Sheet
              </Button>
            </div>

            {/* PRINTABLE RX PAD SHEET CONTAINER */}
            <div className="p-6 bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none font-serif">
              {/* CLINIC HEADER */}
              <div className="text-center space-y-1 border-b-2 border-slate-800 pb-4">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 font-sans">SMILE DENTAL CLINIC</h2>
                <p className="text-xs text-slate-600">123 Healthcare Way, Suite 400 · Dental Care & Surgery Center</p>
                <p className="text-xs text-slate-600">Tel: +63 917 123 4567 · Email: contact@smiledental.local</p>
              </div>

              {/* DOCTOR CREDENTIALS */}
              <div className="flex justify-between items-start text-xs border-b border-slate-200 pb-3 font-sans">
                <div>
                  <p className="font-bold text-sm text-slate-900">{dentistName}</p>
                  <p className="text-slate-600">Doctor of Dental Medicine (DDM)</p>
                </div>
                <div className="text-right text-[11px] text-slate-600 font-mono">
                  <p><span className="font-semibold text-slate-800">Date:</span> {new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</p>
                  {ptrNo && <p><span className="font-semibold text-slate-800">PTR No:</span> {ptrNo}</p>}
                  {s2LicenseNo && <p><span className="font-semibold text-slate-800">S2 License:</span> {s2LicenseNo}</p>}
                </div>
              </div>

              {/* PATIENT DETAILS */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans border-b border-slate-200 pb-3">
                <div>
                  <p className="text-slate-500 font-semibold text-[10px] uppercase">Patient Name</p>
                  <p className="font-bold text-slate-900">{patientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 font-semibold text-[10px] uppercase">Prescription Ref #</p>
                  <p className="font-mono font-bold text-slate-800">RX-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}</p>
                </div>
              </div>

              {/* MEDICAL RX SYMBOL & LINE ITEMS */}
              <div className="space-y-4 min-h-[220px]">
                <div className="text-4xl font-serif font-extrabold text-slate-900 leading-none">
                  ℞
                </div>

                <div className="space-y-4 pl-4 font-sans text-xs">
                  {items.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <p className="font-bold text-slate-900 text-sm">
                          {idx + 1}. {item.medicationName}
                        </p>
                        <span className="font-mono font-bold text-slate-800"># {item.quantity}</span>
                      </div>
                      <p className="text-slate-700 italic pl-3">
                        Sig: {item.dosage} ({item.duration})
                      </p>
                      {item.instructions && (
                        <p className="text-slate-600 text-[11px] pl-3">
                          Instructions: {item.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* CLINICAL NOTES */}
              {notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-sans">
                  <p className="font-bold text-slate-800">Special Notes:</p>
                  <p className="text-slate-700 mt-0.5">{notes}</p>
                </div>
              )}

              {/* SIGNATURE BLOCK */}
              <div className="pt-8 flex justify-end font-sans">
                <div className="text-center w-56 border-t border-slate-900 pt-2 space-y-0.5">
                  <p className="font-bold text-xs text-slate-900">{dentistName}, DDM</p>
                  <p className="text-[10px] text-slate-500">Attending Dental Surgeon Signature</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
