"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  generateInvoiceAction,
  recordPaymentAction,
  checkoutAction,
  getPatientDentalChartSummaryAction,
  requestReceiptReplacementAction,
  reviewReceiptReplacementAction,
  getReceiptHistoryAction,
  getInvoiceAction,
  type InvoiceData,
  type ToothFindingSummary,
  type ReceiptVersionData,
} from "./actions";
import { FollowUpScheduler } from "./follow-up-scheduler";
import type { PaymentMethod } from "@/lib/types/enums";
import { Loader2, Receipt, CreditCard, CheckCircle2, Plus, Sparkles, User, Stethoscope, Clock, Copy, Activity, Image as ImageIcon, X, Eye, History, Upload, FileText, AlertTriangle, ShieldCheck, Check, XCircle } from "lucide-react";

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
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceData | null>(initialInvoice);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [selectedProofModalUrl, setSelectedProofModalUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const srcDataUrl = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
        setProofImage(compressedDataUrl);
      };
      img.src = srcDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const [replacingPaymentId, setReplacingPaymentId] = useState<string | null>(null);
  const [replacementProof, setReplacementProof] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [isReplacing, setIsReplacing] = useState(false);
  const [historyPaymentId, setHistoryPaymentId] = useState<string | null>(null);
  const [historyVersions, setHistoryVersions] = useState<ReceiptVersionData[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("receptionist");
  const [reviewingVersionId, setReviewingVersionId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");

  const handleReplacementFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Replacement file size exceeds 10MB limit");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const srcDataUrl = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
        setReplacementProof(compressedDataUrl);
      };
      img.src = srcDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleExecuteReplacement = async () => {
    if (!replacingPaymentId) return;
    if (!replacementProof) {
      setError("Please attach a replacement proof photo");
      return;
    }
    if (!correctionReason.trim()) {
      setError("A mandatory correction reason is required");
      return;
    }

    setIsReplacing(true);
    setError(null);
    try {
      const res = await requestReceiptReplacementAction(replacingPaymentId, replacementProof, correctionReason);
      if (res.success) {
        if (res.data?.isAutoApproved) {
          setSuccess("Receipt replacement recorded and automatically approved as a new version.");
        } else {
          setSuccess("Receipt replacement request submitted. Awaiting Administrator review and approval.");
        }
        setReplacingPaymentId(null);
        setReplacementProof(null);
        setCorrectionReason("");
        const invRes = await getInvoiceAction(appointmentId);
        if (invRes.success && invRes.data) {
          setInvoice(invRes.data);
        }
        router.refresh();
      } else {
        setError(res.error ?? "Failed to process receipt replacement request");
      }
    } finally {
      setIsReplacing(false);
    }
  };

  const handleOpenReceiptHistory = async (paymentId: string) => {
    setHistoryPaymentId(paymentId);
    setIsLoadingHistory(true);
    try {
      const res = await getReceiptHistoryAction(paymentId);
      if (res.success && res.data) {
        setHistoryVersions(res.data.versions);
        setCurrentUserRole(res.data.currentUserRole);
      } else {
        setHistoryVersions([]);
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleReviewRequest = async (versionId: string, action: "approve" | "reject", rejectionReason?: string) => {
    setReviewingVersionId(versionId);
    setError(null);
    try {
      const res = await reviewReceiptReplacementAction(versionId, action, rejectionReason);
      if (res.success) {
        setSuccess(`Receipt change request ${action === "approve" ? "approved" : "rejected"} successfully.`);
        if (historyPaymentId) {
          const histRes = await getReceiptHistoryAction(historyPaymentId);
          if (histRes.success && histRes.data) {
            setHistoryVersions(histRes.data.versions);
          }
        }
        const invRes = await getInvoiceAction(appointmentId);
        if (invRes.success && invRes.data) {
          setInvoice(invRes.data);
        }
        router.refresh();
      } else {
        setError(res.error ?? "Failed to review receipt request");
      }
    } finally {
      setReviewingVersionId(null);
    }
  };

  const [chartFindings, setChartFindings] = useState<ToothFindingSummary[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [copiedChart, setCopiedChart] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    setIsLoadingChart(true);
    getPatientDentalChartSummaryAction(appointmentId).then((res) => {
      if (mounted && res.success && res.data) {
        setChartFindings(res.data);
      }
      if (mounted) setIsLoadingChart(false);
    });

    if (initialInvoice?.payments && initialInvoice.payments.length > 0) {
      const paymentId = initialInvoice.payments[0].id;
      getReceiptHistoryAction(paymentId).then((res) => {
        if (mounted && res.success && res.data) {
          setCurrentUserRole(res.data.currentUserRole);
          const pending = res.data.versions.filter((v) => v.status === "pending").length;
          setPendingRequestsCount(pending);
        }
      });
    }

    return () => {
      mounted = false;
    };
  }, [appointmentId, initialInvoice]);

  const handleCopyFindings = () => {
    if (chartFindings.length === 0) return;
    const text = chartFindings
      .map(
        (f) =>
          `Tooth #${f.toothNumber}: ${f.findingCode}${
            f.surfaces.length > 0 ? ` (${f.surfaces.join(", ")})` : ""
          }${f.notes ? ` - ${f.notes}` : ""}`,
      )
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopiedChart(true);
    setTimeout(() => setCopiedChart(false), 2500);
  };

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
        router.refresh();
      } else {
        setError(result.error ?? "Failed to generate invoice");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePay = async () => {
    const amountStr = paymentAmount.trim() || (remaining > 0 ? remaining.toString() : "");
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }

    if (!invoice) return;

    if (paymentMethod !== "cash" && !proofImage) {
      setError("Please attach a proof of payment photo (receipt/slip) before confirming.");
      return;
    }

    setIsPaying(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await recordPaymentAction(
        invoice.id,
        amount,
        paymentMethod,
        paymentMethod !== "cash" ? proofImage : null,
      );
      if (result.success) {
        setSuccess("Payment recorded successfully");
        setShowPaymentForm(false);
        setPaymentAmount("");
        setProofImage(null);
        const fetchResult = await import("./actions").then((m) => m.getInvoiceAction(appointmentId));
        if (fetchResult.success && fetchResult.data) {
          setInvoice(fetchResult.data);
        }
        router.refresh();
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
        setInvoice((prev) => (prev ? { ...prev, visitStatus: "completed", bookingStatus: "completed" } : prev));
        router.refresh();
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

  const isVisitCompleted = invoice.visitStatus === "completed" || invoice.bookingStatus === "completed";

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

        {isVisitCompleted ? (
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-xs font-semibold px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600 inline" /> Visit Completed & Checked Out
          </Badge>
        ) : (
          <Button onClick={handleCheckout} disabled={isCheckingOut} size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs">
            {isCheckingOut ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
            Complete Visit & Checkout
          </Button>
        )}
      </div>

      {pendingRequestsCount > 0 && (
        <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-xs">Pending Receipt Change Request ({pendingRequestsCount})</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Staff has submitted a replacement receipt photo awaiting Admin review and approval.</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (invoice.payments[0]?.id) {
                handleOpenReceiptHistory(invoice.payments[0].id);
              }
            }}
            className="h-8 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs shrink-0"
          >
            Review & Approve Change
          </Button>
        </div>
      )}

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
            {remaining > 0 && invoice.paymentStatus !== "paid" ? (
              !showPaymentForm && (
                <Button
                  size="sm"
                  onClick={() => {
                    setPaymentAmount(remaining.toString());
                    setShowPaymentForm(true);
                  }}
                  className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Record Payment
                </Button>
              )
            ) : (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-xs font-semibold px-2.5 py-1">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Invoice Fully Settled
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            {remaining > 0 && invoice.paymentStatus !== "paid" && showPaymentForm && (
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

                {paymentMethod !== "cash" && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-cyan-600" /> Proof of Payment Photo (GCash / Card / Transfer Screenshot)
                    </Label>
                    {proofImage ? (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10">
                        <img src={proofImage} alt="Proof" className="h-12 w-12 object-cover rounded-lg border border-cyan-500/50" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">Proof Image Attached</p>
                          <p className="text-[10px] text-muted-foreground">Will be saved with transaction record</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setProofImage(null)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="h-9 text-xs border-border/80 rounded-xl cursor-pointer file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
                      />
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(false)} className="h-8 rounded-xl text-xs">Cancel</Button>
                  <Button
                    size="sm"
                    onClick={handlePay}
                    disabled={isPaying || (paymentMethod !== "cash" && !proofImage)}
                    className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                  >
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
                    <div className="flex items-center gap-3">
                      {p.proofImageUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedProofModalUrl(p.proofImageUrl)}
                          className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-cyan-500/40 group cursor-pointer"
                        >
                          <img src={p.proofImageUrl} alt="Proof" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="h-3.5 w-3.5 text-white" />
                          </div>
                        </button>
                      )}
                      <div>
                        <p className="font-bold text-foreground">{formatPeso(p.amount)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{p.method} · {new Date(p.paidAt).toLocaleString("en-PH")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReceiptHistory(p.id)}
                        className="h-7 text-[10px] border-border/80 text-foreground bg-card hover:bg-muted rounded-lg px-2 shadow-2xs"
                      >
                        <History className="mr-1 h-3 w-3 text-cyan-600" /> View History
                      </Button>

                      {p.proofImageUrl && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReplacingPaymentId(p.id);
                              setReplacementProof(null);
                              setCorrectionReason("");
                            }}
                            className="h-7 text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg px-2 shadow-2xs"
                          >
                            <Upload className="mr-1 h-3 w-3" /> Replace Photo
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProofModalUrl(p.proofImageUrl)}
                            className="h-7 text-[10px] border-cyan-500/30 text-cyan-600 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg px-2 shadow-2xs"
                          >
                            <Eye className="mr-1 h-3 w-3" /> View Proof
                          </Button>
                        </>
                      )}
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px]">Received</Badge>
                    </div>
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

      {/* PATIENT DENTAL CHART FINDINGS SUMMARY CARD */}
      <Card className="border border-border/80 bg-card rounded-2xl shadow-xs">
        <CardHeader className="border-b border-border/40 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-600" />
              Patient Dental Chart Findings Summary ({chartFindings.length})
            </CardTitle>
            <CardDescription className="text-xs">
              FDI tooth findings & surface records from patient consultation chart
            </CardDescription>
          </div>
          {chartFindings.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyFindings}
              className="h-8 rounded-xl text-xs font-semibold border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/10"
            >
              {copiedChart ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> : <Copy className="mr-1.5 h-3.5 w-3.5 text-cyan-600" />}
              {copiedChart ? "Copied!" : "1-Click Copy Summary"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {isLoadingChart ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
            </div>
          ) : chartFindings.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground italic">
              No active tooth findings recorded on patient chart yet.
            </p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {chartFindings.map((f, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Tooth #{f.toothNumber}</span>
                    <Badge className="bg-cyan-500/10 text-cyan-700 border border-cyan-500/30 text-[10px] uppercase font-bold">
                      {f.findingCode.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {f.surfaces.length > 0 && (
                    <div className="text-[11px] text-muted-foreground">
                      Surfaces: <span className="font-semibold text-foreground font-mono">{f.surfaces.join(", ")}</span>
                    </div>
                  )}
                  {f.notes && <p className="text-[11px] italic text-muted-foreground pt-0.5">"{f.notes}"</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FollowUpScheduler appointmentId={appointmentId} services={[]} />

      {/* PROOF RECEIPT FULLSCREEN VIEWER MODAL */}
      <Dialog open={!!selectedProofModalUrl} onOpenChange={() => setSelectedProofModalUrl(null)}>
        <DialogContent className="max-w-md rounded-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-cyan-600" /> Digital Payment Proof Receipt
            </DialogTitle>
          </DialogHeader>
          {selectedProofModalUrl && (
            <div className="mt-2 space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/80 bg-muted/40 max-h-[70vh] flex items-center justify-center p-2">
                <img src={selectedProofModalUrl} alt="Receipt Proof" className="max-h-[65vh] w-auto object-contain rounded-lg shadow-xs" />
              </div>
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setSelectedProofModalUrl(null)} className="rounded-xl text-xs">
                  Close Preview
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* REPLACE RECEIPT PHOTO MODAL */}
      <Dialog open={!!replacingPaymentId} onOpenChange={(open) => !open && setReplacingPaymentId(null)}>
        <DialogContent className="max-w-md rounded-2xl p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Upload className="h-4 w-4 text-cyan-600" />
              Replace / Request Receipt Photo Change
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-900 dark:text-cyan-200">
              <p className="font-bold flex items-center gap-1.5 text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-600" /> Approval Workflow Notice
              </p>
              <p className="text-[11px] mt-0.5 leading-relaxed">
                Staff replacement submissions are sent to Clinic Administrators for approval before updating. Admin submissions automatically approve instantly.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">
                Mandatory Correction Reason *
              </Label>
              <Input
                placeholder='e.g., "Uploaded wrong GCash screenshot by mistake"'
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="h-9 text-xs border-border/80 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                New Replacement Photo *
              </Label>
              {replacementProof ? (
                <div className="flex items-center gap-3 p-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10">
                  <img src={replacementProof} alt="Replacement proof" className="h-12 w-12 object-cover rounded-lg border border-cyan-500/50" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">Replacement Photo Attached</p>
                    <p className="text-[10px] text-muted-foreground">Ready for submission</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReplacementProof(null)} className="h-7 w-7 p-0 text-red-500">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleReplacementFileSelect}
                  className="h-9 text-xs border-border/80 rounded-xl cursor-pointer file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-cyan-600 file:text-white"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setReplacingPaymentId(null)} className="h-8 rounded-xl text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteReplacement}
                disabled={isReplacing || !replacementProof || !correctionReason.trim()}
                className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {isReplacing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit Receipt Change"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* RECEIPT VERSION HISTORY & ADMIN REVIEW MODAL */}
      <Dialog open={!!historyPaymentId} onOpenChange={(open) => !open && setHistoryPaymentId(null)}>
        <DialogContent className="max-w-lg rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-cyan-600" />
              Receipt Photo Audit Trail & Change Requests
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            {isLoadingHistory ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-cyan-600" />
                <p className="text-xs text-muted-foreground mt-2">Loading audit paper trail...</p>
              </div>
            ) : historyVersions.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground italic">No receipt history recorded for this payment entry.</p>
            ) : (
              <div className="space-y-3">
                {historyVersions.map((ver) => (
                  <div key={ver.id} className={`p-3.5 rounded-xl border space-y-2.5 ${
                    ver.status === "approved" ? "border-emerald-500/30 bg-emerald-500/5" :
                    ver.status === "pending" ? "border-amber-500/40 bg-amber-500/10" :
                    "border-rose-500/30 bg-rose-500/5"
                  }`}>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-[10px] font-bold font-mono ${
                        ver.status === "approved"
                          ? ver.versionNumber === 1
                            ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/15"
                            : "border-teal-500/40 text-teal-700 bg-teal-500/15"
                          : ver.status === "pending"
                          ? "border-amber-500/40 text-amber-700 bg-amber-500/20"
                          : "border-rose-500/40 text-rose-700 bg-rose-500/15"
                      }`}>
                        {ver.status === "approved"
                          ? ver.versionNumber === 1 ? "Version 1 (Original)" : `Version ${ver.versionNumber} (Approved)`
                          : ver.status === "pending"
                          ? "Pending Admin Approval"
                          : "Rejected Request"}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {new Date(ver.createdAt).toLocaleString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true, month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs font-mono">
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Requested By:</span> {ver.requestedByEmail}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-foreground">Reason:</span> {ver.correctionReason}
                      </p>
                      {ver.reviewedByEmail && (
                        <p className="text-muted-foreground">
                          <span className="font-semibold text-foreground">Reviewed By Admin:</span> {ver.reviewedByEmail}
                        </p>
                      )}
                      {ver.rejectionReason && (
                        <p className="text-rose-600 font-semibold">
                          <span>Rejection Reason:</span> {ver.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-border/40 gap-2">
                      {ver.proofImageUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProofModalUrl(ver.proofImageUrl)}
                          className="h-7 text-[10px] border-cyan-500/30 text-cyan-600 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg px-2"
                        >
                          <Eye className="mr-1 h-3 w-3" /> View Photo Attachment
                        </Button>
                      )}

                      {/* ADMIN ACTION BUTTONS FOR PENDING REQUESTS */}
                      {currentUserRole === "admin" && ver.status === "pending" && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleReviewRequest(ver.id, "approve")}
                            disabled={reviewingVersionId === ver.id}
                            className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 font-bold shadow-2xs"
                          >
                            {reviewingVersionId === ver.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                            Approve Change
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const reason = prompt("Optional rejection reason for staff:") ?? "";
                              handleReviewRequest(ver.id, "reject", reason);
                            }}
                            disabled={reviewingVersionId === ver.id}
                            className="h-7 text-[10px] bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-2.5 font-bold shadow-2xs"
                          >
                            {reviewingVersionId === ver.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="mr-1 h-3 w-3" />}
                            Reject Request
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
