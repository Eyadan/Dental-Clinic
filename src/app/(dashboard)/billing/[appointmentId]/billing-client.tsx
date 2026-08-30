"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generateInvoiceAction,
  recordPaymentAction,
  checkoutAction,
  type InvoiceData,
} from "./actions";
import { FollowUpScheduler } from "./follow-up-scheduler";
import type { PaymentMethod } from "@/lib/types/enums";
import { Loader2, Receipt, CreditCard, CheckCircle2, Plus, Sparkles, User, Stethoscope, Clock } from "lucide-react";

interface BillingClientProps {
  appointmentId: string;
  invoice: InvoiceData | null;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "gcash", label: "GCash" },
  { value: "maya", label: "Maya" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BillingClient({ appointmentId, invoice: initialInvoice }: BillingClientProps) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(initialInvoice);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const totalPaid = invoice?.payments.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const remaining = invoice ? invoice.totalAmount - totalPaid : 0;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await generateInvoiceAction(appointmentId);
      if (result.success) {
        setSuccess("Invoice generated successfully");
        const fetchResult = await import("./actions").then((m) => m.getInvoiceAction(appointmentId));
        if (fetchResult.success && fetchResult.data) {
          setInvoice(fetchResult.data);
        }
      } else {
        setError(result.error ?? "Failed to generate invoice");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePay = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }

    if (!invoice) return;

    setIsPaying(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await recordPaymentAction(invoice.id, amount, paymentMethod, null);
      if (result.success) {
        setSuccess("Payment recorded successfully");
        setShowPaymentForm(false);
        setPaymentAmount("");
        const fetchResult = await import("./actions").then((m) => m.getInvoiceAction(appointmentId));
        if (fetchResult.success && fetchResult.data) {
          setInvoice(fetchResult.data);
        }
      } else {
        setError(result.error ?? "Failed to record payment");
      }
    } finally {
      setIsPaying(false);
    }
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await checkoutAction(appointmentId);
      if (result.success) {
        setSuccess("Checkout complete — patient visit finished");
      } else {
        setError(result.error ?? "Checkout failed");
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!invoice) {
    return (
      <div className="space-y-6">
        {/* BRANDED HERO HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Billing & Invoice Generator</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Generate treatment receipts and record patient payments</p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-2xl border-red-500/20 bg-red-500/5">
            <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs py-16 text-center">
          <CardContent className="space-y-4 max-w-sm mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 shadow-xs">
              <Receipt className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">No Invoice Generated Yet</h3>
              <p className="text-xs text-muted-foreground">Generate a breakdown of procedure costs and treatment items for this appointment.</p>
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating} size="sm" className="h-9 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold shadow-xs">
              {isGenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Receipt className="mr-1.5 h-3.5 w-3.5" />}
              Generate Patient Invoice
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BRANDED HERO HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white shadow-md shadow-cyan-500/20">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Patient Invoice #{invoice.id.slice(0, 8).toUpperCase()}</h1>
              <Badge variant="outline" className={`text-[10px] font-bold uppercase ${
                invoice.paymentStatus === "paid" ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" :
                invoice.paymentStatus === "partially_paid" ? "border-orange-500/30 text-orange-600 bg-orange-500/10" :
                "border-amber-500/30 text-amber-600 bg-amber-500/10"
              }`}>
                {invoice.paymentStatus.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">Patient: {invoice.patientName} · Dentist: {invoice.dentistName}</p>
          </div>
        </div>

        <Button onClick={handleCheckout} disabled={isCheckingOut} size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs">
          {isCheckingOut ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
          Complete Visit & Checkout
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl border-red-500/20 bg-red-500/5">
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="rounded-2xl border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <AlertDescription className="text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {success}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* INVOICE DETAILS */}
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
          <CardHeader className="border-b border-border/40 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-cyan-600" /> Invoice Line Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            <div className="space-y-2">
              {invoice.lineItems.map((item, idx) => (
                <div key={item.serviceId || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <div>
                    <p className="font-bold text-foreground">{item.serviceName}</p>
                  </div>
                  <span className="font-bold text-foreground font-mono">{formatPeso(item.price)}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border/40 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-base font-extrabold text-foreground pt-1 border-t border-border/40">
                <span>Total Amount Due</span>
                <span className="text-cyan-600">{formatPeso(invoice.totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PAYMENTS & RECEIPT HISTORY */}
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
          <CardHeader className="border-b border-border/40 pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-cyan-600" /> Recorded Payments ({invoice.payments.length})
            </CardTitle>
            {remaining > 0 && !showPaymentForm && (
              <Button size="sm" onClick={() => setShowPaymentForm(true)} className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold">
                <Plus className="mr-1 h-3.5 w-3.5" /> Record Payment
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            {showPaymentForm && (
              <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Amount (₱)</Label>
                    <Input
                      type="number"
                      placeholder={remaining.toFixed(2)}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="h-9 text-xs border-border/80 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                      <SelectTrigger className="h-9 text-xs border-border/80 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(false)} className="h-8 rounded-xl text-xs">Cancel</Button>
                  <Button size="sm" onClick={handlePay} disabled={isPaying} className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold">
                    {isPaying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm Payment"}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {invoice.payments.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground italic">No payments recorded yet.</p>
              ) : (
                invoice.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20 font-mono text-xs">
                    <div>
                      <p className="font-bold text-foreground">{formatPeso(p.amount)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{p.method} · {new Date(p.paidAt).toLocaleString("en-PH")}</p>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px]">Received</Badge>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-border/40 space-y-1 font-mono text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Paid</span>
                <span className="font-bold text-emerald-600">{formatPeso(totalPaid)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Balance Remaining</span>
                <span className={`font-bold ${remaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>{formatPeso(remaining)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <FollowUpScheduler appointmentId={appointmentId} services={[]} />
    </div>
  );
}
