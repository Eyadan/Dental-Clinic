"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  generateInvoiceAction,
  recordPaymentAction,
  checkoutAction,
  type InvoiceData,
} from "./actions";
import { FollowUpScheduler } from "./follow-up-scheduler";
import type { PaymentMethod } from "@/lib/types/enums";
import { Loader2, Receipt, CreditCard, CheckCircle2, Plus } from "lucide-react";

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
        setSuccess("Invoice generated");
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
        setSuccess("Payment recorded");
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
        setSuccess("Checkout complete — visit finished");
      } else {
        setError(result.error ?? "Checkout failed");
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid": return "default" as const;
      case "partially_paid": return "secondary" as const;
      case "pending_payment": return "outline" as const;
      default: return "outline" as const;
    }
  };

  if (!invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Billing</h1>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No invoice generated yet</p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="mr-2 h-4 w-4" />
              )}
              Generate Invoice
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billing</h1>
        <Badge variant={statusBadgeVariant(invoice.paymentStatus)}>
          {invoice.paymentStatus.replace(/_/g, " ").toUpperCase()}
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient</span>
                <span className="font-medium">{invoice.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact</span>
                <span>{invoice.patientContact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dentist</span>
                <span>{invoice.dentistName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{new Date(invoice.appointmentDate).toLocaleString()}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Line Items</p>
              <div className="space-y-2">
                {invoice.lineItems.map((item) => (
                  <div key={item.serviceId} className="flex justify-between text-sm">
                    <span>{item.serviceName}</span>
                    <span className="tabular-nums">{formatPeso(item.price)}</span>
                  </div>
                ))}
                {invoice.lineItems.length === 0 && (
                  <p className="text-sm text-muted-foreground">No services found</p>
                )}
              </div>
            </div>

            <div className="border-t pt-4 space-y-1">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span className="tabular-nums">{formatPeso(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Paid</span>
                <span className="tabular-nums">{formatPeso(totalPaid)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Remaining</span>
                <span className="tabular-nums">{formatPeso(remaining)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Payment History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded</p>
              ) : (
                invoice.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between text-sm border-b pb-2">
                    <div>
                      <span className="font-medium uppercase">{payment.method}</span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.paidAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="tabular-nums">{formatPeso(payment.amount)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {showPaymentForm ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Record Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₱)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={remaining.toFixed(2)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method</Label>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <Button
                        key={m.value}
                        type="button"
                        size="sm"
                        variant={paymentMethod === m.value ? "default" : "outline"}
                        onClick={() => setPaymentMethod(m.value)}
                      >
                        {m.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handlePay} disabled={isPaying} size="sm">
                    {isPaying ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-3 w-3" />
                    )}
                    Submit Payment
                  </Button>
                  <Button
                    onClick={() => setShowPaymentForm(false)}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            remaining > 0.01 && (
              <Button
                onClick={() => setShowPaymentForm(true)}
                variant="outline"
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            )
          )}

          {remaining <= 0.01 && invoice.paymentStatus !== "pending_payment" && (
            <Button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full"
              size="lg"
            >
              {isCheckingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Complete Checkout
            </Button>
          )}
        </div>
      </div>

      <FollowUpScheduler
        appointmentId={appointmentId}
        services={invoice.lineItems.map((item) => ({
          id: item.serviceId,
          name: item.serviceName,
        }))}
      />
    </div>
  );
}
