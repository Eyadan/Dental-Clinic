"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText } from "lucide-react";
import type { InvoiceData } from "@/app/(dashboard)/billing/[appointmentId]/actions";

interface PrintableInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceData;
}

export function PrintableInvoiceDialog({
  open,
  onOpenChange,
  invoice,
}: PrintableInvoiceDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, invoice.totalAmount - totalPaid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-3 pr-6 space-y-0">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-600" />
            Official Printable Invoice & Receipt
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print / Export PDF
            </Button>
          </div>
        </DialogHeader>

        {/* PRINTABLE CANVAS BLOCK */}
        <div className="p-6 bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-xs space-y-6 print:p-0 print:border-none print:shadow-none font-sans">
          {/* CLINIC LETTERHEAD */}
          <div className="text-center space-y-1 border-b-2 border-slate-800 pb-4">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">SMILE DENTAL CLINIC</h2>
            <p className="text-xs font-medium text-slate-600">123 Healthcare Way, Suite 400 · Dental Care & Surgery Center</p>
            <p className="text-xs text-slate-600">Tel: +63 917 123 4567 · Email: billing@smiledental.local</p>
          </div>

          {/* INVOICE METADATA & DOCTOR CREDENTIALS */}
          <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Patient Information</p>
              <p className="font-bold text-sm text-slate-900">{invoice.patientName}</p>
              {invoice.patientContact && <p className="text-slate-600 font-mono text-[11px]">Phone: {invoice.patientContact}</p>}
            </div>
            <div className="text-right space-y-1 font-mono">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-sans">Statement Reference</p>
              <p className="font-bold text-sm text-slate-900">INV-{invoice.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-slate-600 text-[11px]">Date: {new Date(invoice.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</p>
            </div>
          </div>

          {/* ATTENDING DENTIST CREDENTIALS */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Attending Dentist</p>
              <p className="font-bold text-slate-900">Dr. {invoice.dentistName}</p>
              {invoice.dentistSpecialization && <p className="text-[11px] text-slate-600">{invoice.dentistSpecialization}</p>}
            </div>
            <div className="text-right font-mono text-[11px] text-slate-700">
              {invoice.dentistLicenseNo && <p><span className="font-semibold text-slate-900 font-sans">PRC Lic No:</span> {invoice.dentistLicenseNo}</p>}
              {invoice.dentistPtrNo && <p><span className="font-semibold text-slate-900 font-sans font-bold">PTR No:</span> {invoice.dentistPtrNo}</p>}
              {invoice.dentistS2No && <p><span className="font-semibold text-slate-900 font-sans">S2 Lic No:</span> {invoice.dentistS2No}</p>}
            </div>
          </div>

          {/* ITEMIZED SERVICES BREAKDOWN TABLE */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Itemized Dental Procedures & Services</p>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                  <th className="py-2 px-3">Service Description</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {invoice.lineItems.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{item.serviceName}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">₱{item.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FINANCIAL SUMMARY TOTALS */}
          <div className="pt-3 border-t-2 border-slate-800 flex justify-end font-mono text-xs">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-slate-700">
                <span>Subtotal Amount:</span>
                <span className="font-bold">₱{invoice.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Total Amount Paid:</span>
                <span className="font-bold">₱{totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-900 text-sm font-black pt-2 border-t border-slate-300">
                <span>Balance Remaining:</span>
                <span className={remaining > 0 ? "text-amber-700" : "text-emerald-700"}>₱{remaining.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* PAYMENT TRANSACTION HISTORY (IF ANY) */}
          {invoice.payments.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Payment Receipts & History</p>
              <div className="space-y-1 font-mono text-[11px]">
                {invoice.payments.map((p, idx) => (
                  <div key={p.id || idx} className="flex justify-between p-1.5 bg-slate-50 rounded border border-slate-200 text-slate-800">
                    <span>{new Date(p.paidAt).toLocaleDateString("en-PH")} — {p.method.toUpperCase()}</span>
                    <span className="font-bold">₱{p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SIGNATURE & FOOTER ACKNOWLEDGEMENT */}
          <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t border-slate-800 pt-2">
              <p className="font-bold text-slate-900">Clinic Cashier / Receptionist</p>
              <p className="text-[10px] text-slate-500">Authorized Official Receipt Signature</p>
            </div>
            <div className="border-t border-slate-800 pt-2">
              <p className="font-bold text-slate-900">Dr. {invoice.dentistName}, DDM</p>
              <p className="text-[10px] text-slate-500">Attending Dental Surgeon Signature</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
