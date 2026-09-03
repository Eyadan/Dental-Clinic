"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, Printer, Trash2, Eye, Plus, Loader2, FileText } from "lucide-react";
import { getPrescriptionsByAppointmentAction, deletePrescriptionAction } from "./rx-actions";
import type { PrescriptionData } from "./rx-types";

interface RxHistoryViewerProps {
  appointmentId: string;
  patientId: string;
  patientName: string;
  dentistName: string;
  onOpenCreateDialog: () => void;
}

export function RxHistoryViewer({
  appointmentId,
  patientId,
  patientName,
  dentistName,
  onOpenCreateDialog,
}: RxHistoryViewerProps) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRx, setSelectedRx] = useState<PrescriptionData | null>(null);

  const fetchPrescriptions = async () => {
    setIsLoading(true);
    try {
      const res = await getPrescriptionsByAppointmentAction(appointmentId);
      if (res.success && res.data) {
        setPrescriptions(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [appointmentId]);

  const handleDelete = async (rxId: string) => {
    if (!confirm("Are you sure you want to delete this prescription record?")) return;
    const res = await deletePrescriptionAction(rxId, appointmentId);
    if (res.success) {
      fetchPrescriptions();
    }
  };

  const handlePrintSelected = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Pill className="h-4 w-4 text-cyan-600" /> Issued Prescriptions ({prescriptions.length})
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Medical prescriptions composed and printed for this consultation session
          </p>
        </div>
        <Button
          size="sm"
          onClick={onOpenCreateDialog}
          className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Compose New Prescription
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-cyan-600" />
          <p className="text-xs text-muted-foreground mt-2">Loading prescriptions...</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs py-10 text-center">
          <CardContent className="space-y-3">
            <Pill className="mx-auto h-9 w-9 text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground">No Prescriptions Issued Yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Compose an official prescription sheet with pre-filled antibiotics, analgesics, and mouthwash templates.
            </p>
            <Button
              size="sm"
              onClick={onOpenCreateDialog}
              className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Issue First Prescription
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <Card key={rx.id} className="border border-border/80 bg-card rounded-2xl shadow-2xs hover:shadow-xs transition-all">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 bg-cyan-500/10 text-[10px] font-mono font-bold">
                      {rx.prescriptionNo}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(rx.createdAt).toLocaleString("en-PH", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRx(rx)}
                      className="h-7 text-[11px] border-cyan-500/30 text-cyan-600 bg-cyan-500/10 hover:bg-cyan-600 hover:text-white rounded-lg px-2.5 font-semibold"
                    >
                      <Eye className="mr-1 h-3 w-3" /> View / Print RX Sheet
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(rx.id)}
                      className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 pl-1 text-xs">
                  {rx.items.map((item, idx) => (
                    <div key={idx} className="flex items-baseline justify-between text-xs font-mono">
                      <p className="font-semibold text-foreground">
                        {idx + 1}. {item.medicationName} — <span className="text-muted-foreground font-normal">{item.dosage} ({item.duration})</span>
                      </p>
                      <span className="text-muted-foreground font-bold"># {item.quantity}</span>
                    </div>
                  ))}
                </div>

                {rx.notes && (
                  <p className="text-[11px] text-muted-foreground italic bg-muted/40 p-2 rounded-xl border border-border/50">
                    Notes: {rx.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* VIEW & PRINT SINGLE RX MODAL */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card max-w-2xl w-full rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto border border-border/80 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Pill className="h-4 w-4 text-cyan-600" /> Prescription Sheet ({selectedRx.prescriptionNo})
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handlePrintSelected}
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Sheet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRx(null)}
                  className="h-8 rounded-xl text-xs"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* PRINTABLE SHEET */}
            <div className="p-6 bg-white text-slate-900 border border-slate-300 rounded-2xl space-y-6 font-serif">
              <div className="text-center space-y-1 border-b-2 border-slate-800 pb-4 font-sans">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">{selectedRx.clinicName}</h2>
                <p className="text-xs text-slate-600">{selectedRx.clinicAddress}</p>
                <p className="text-xs text-slate-600">Tel: {selectedRx.clinicContact}</p>
              </div>

              <div className="flex justify-between items-start text-xs border-b border-slate-200 pb-3 font-sans">
                <div>
                  <p className="font-bold text-sm text-slate-900">{selectedRx.dentistName}</p>
                  <p className="text-slate-600">Doctor of Dental Medicine (DDM)</p>
                </div>
                <div className="text-right text-[11px] text-slate-600 font-mono">
                  <p><span className="font-semibold text-slate-800">Date:</span> {new Date(selectedRx.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</p>
                  {selectedRx.ptrNo && <p><span className="font-semibold text-slate-800">PTR No:</span> {selectedRx.ptrNo}</p>}
                  {selectedRx.s2LicenseNo && <p><span className="font-semibold text-slate-800">S2 License:</span> {selectedRx.s2LicenseNo}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-sans border-b border-slate-200 pb-3">
                <div>
                  <p className="text-slate-500 font-semibold text-[10px] uppercase">Patient Name</p>
                  <p className="font-bold text-slate-900">{selectedRx.patientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 font-semibold text-[10px] uppercase">Prescription Ref #</p>
                  <p className="font-mono font-bold text-slate-800">{selectedRx.prescriptionNo}</p>
                </div>
              </div>

              <div className="space-y-4 min-h-[200px]">
                <div className="text-4xl font-serif font-extrabold text-slate-900 leading-none">
                  ℞
                </div>

                <div className="space-y-4 pl-4 font-sans text-xs">
                  {selectedRx.items.map((item, idx) => (
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

              {selectedRx.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-sans">
                  <p className="font-bold text-slate-800">Special Notes:</p>
                  <p className="text-slate-700 mt-0.5">{selectedRx.notes}</p>
                </div>
              )}

              <div className="pt-8 flex justify-end font-sans">
                <div className="text-center w-56 border-t border-slate-900 pt-2 space-y-0.5">
                  <p className="font-bold text-xs text-slate-900">{selectedRx.dentistName}, DDM</p>
                  <p className="text-[10px] text-slate-500">Attending Dental Surgeon Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
