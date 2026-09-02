"use client";

import { useEffect, useState, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileText, Receipt, CircleDot, ArrowUpRight } from "lucide-react";
import { getPatientBillingHistoryAction, type PatientBillingItem } from "@/app/(dashboard)/patients/[id]/billing-actions";

interface PatientBillingHistoryProps {
  patientId: string;
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" },
  pending_payment: { label: "Pending", className: "border-amber-500/30 text-amber-600 bg-amber-500/10" },
  partially_paid: { label: "Partially Paid", className: "border-blue-500/30 text-blue-600 bg-blue-500/10" },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const PatientBillingHistory = memo(function PatientBillingHistory({
  patientId,
}: PatientBillingHistoryProps) {
  const [items, setItems] = useState<PatientBillingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPatientBillingHistoryAction(patientId).then((res) => {
      if (res.success && res.data) {
        setItems(res.data);
      } else {
        setError(res.error ?? "Failed to load billing history");
      }
      setIsLoading(false);
    });
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
        <CardContent className="p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-bold text-foreground">No Billing Records</p>
          <p className="text-xs text-muted-foreground mt-1">
            Invoices and payment receipts will appear here once the patient has approved appointments.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalBilled = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalPaid = items.reduce(
    (sum, item) => sum + item.payments.reduce((s, p) => s + p.amount, 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Billed</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{formatCurrency(totalBilled)}</p>
          </CardContent>
        </Card>
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Paid</p>
            <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Records */}
      <div className="space-y-3">
        {items.map((item) => {
          const paidAmount = item.payments.reduce((s, p) => s + p.amount, 0);
          const remaining = item.totalAmount - paidAmount;
          const statusCfg = item.paymentStatus
            ? PAYMENT_STATUS_CONFIG[item.paymentStatus] ?? {
                label: item.paymentStatus.replace(/_/g, " "),
                className: "border-border text-muted-foreground",
              }
            : null;

          return (
            <Card key={item.appointmentId} className="border border-border/80 bg-card rounded-2xl shadow-xs">
              <CardHeader className="border-b border-border/40 pb-3 flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-cyan-600" />
                  {item.referenceNo}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {statusCfg && (
                    <Badge variant="outline" className={`text-[10px] font-bold ${statusCfg.className}`}>
                      {statusCfg.label}
                    </Badge>
                  )}
                  <a
                    href={`/billing/${item.appointmentId}`}
                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-cyan-600 hover:text-cyan-700 transition-colors"
                  >
                    View <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* Appointment Info */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{formatDate(item.scheduledDate)}</span>
                    <span className="text-muted-foreground font-mono">{item.scheduledTime}</span>
                    <span className="text-muted-foreground">· {item.dentistName}</span>
                  </div>
                </div>

                {/* Services */}
                {item.services.length > 0 && (
                  <div className="space-y-1">
                    {item.services.map((svc, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-muted/30">
                        <span className="flex items-center gap-1.5 text-foreground">
                          <CircleDot className="h-2.5 w-2.5 text-cyan-600/60" />
                          {svc.name}
                        </span>
                        <span className="font-mono font-semibold text-foreground">{formatCurrency(svc.price)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Payment Summary */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="space-y-0.5">
                    {item.payments.length > 0 ? (
                      item.payments.map((p) => (
                        <div key={p.id} className="text-[10px] text-muted-foreground">
                          {formatCurrency(p.amount)} via {p.method.replace(/_/g, " ")} · {formatDate(p.paidAt)}
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-muted-foreground">No payments recorded</p>
                    )}
                  </div>
                  <div className="text-right">
                    {remaining > 0.01 && (
                      <p className="text-[10px] text-amber-600 font-semibold">
                        Remaining: {formatCurrency(remaining)}
                      </p>
                    )}
                    <p className="text-sm font-bold text-foreground">{formatCurrency(item.totalAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
});
