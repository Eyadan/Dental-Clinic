"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Search, ArrowUpRight, Clock, User, Stethoscope, Sparkles } from "lucide-react";

export interface BillingListItem {
  appointmentId: string;
  referenceNo: string;
  patientName: string;
  dentistName: string;
  scheduledDate: string;
  scheduledTime: string;
  invoiceId: string | null;
  totalAmount: number | null;
  paymentStatus: string | null;
  visitStatus: string | null;
}

interface BillingListClientProps {
  items: BillingListItem[];
}

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  pending_payment: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  partially_paid: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  payment_failed: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending Payment",
  partially_paid: "Partially Paid",
  paid: "Paid",
  payment_failed: "Payment Failed",
};

export function BillingListClient({ items }: BillingListClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "paid" | "all">("pending");

  const pendingCount = useMemo(
    () => items.filter((i) => (i.paymentStatus ?? "pending_payment") !== "paid").length,
    [items],
  );
  const paidCount = useMemo(
    () => items.filter((i) => (i.paymentStatus ?? "pending_payment") === "paid").length,
    [items],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const status = item.paymentStatus ?? "pending_payment";
      if (statusFilter === "pending" && status === "paid") return false;
      if (statusFilter === "paid" && status !== "paid") return false;

      if (!search.trim()) return true;
      const query = search.toLowerCase().trim();
      return (
        item.patientName.toLowerCase().includes(query) ||
        item.referenceNo.toLowerCase().includes(query) ||
        item.dentistName.toLowerCase().includes(query)
      );
    });
  }, [items, search, statusFilter]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

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
              <h1 className="text-xl font-bold tracking-tight text-foreground">Billing & Patient Invoices</h1>
              <Badge variant="outline" className="border-border text-foreground font-mono text-[10px]">
                {items.length} records
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Manage patient billing records, payment receipts, and invoices</p>
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              statusFilter === "pending"
                ? "bg-card text-cyan-600 shadow-xs border border-border/80 font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Unpaid & Pending
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusFilter === "pending" ? "bg-amber-500/10 text-amber-700 border-amber-500/30" : ""}`}>
              {pendingCount}
            </Badge>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("paid")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              statusFilter === "paid"
                ? "bg-card text-cyan-600 shadow-xs border border-border/80 font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Paid & Settled
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusFilter === "paid" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : ""}`}>
              {paidCount}
            </Badge>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              statusFilter === "all"
                ? "bg-card text-cyan-600 shadow-xs border border-border/80 font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Records
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {items.length}
            </Badge>
          </button>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice or patient..."
            className="pl-10 h-10 border-border/80 focus-visible:ring-cyan-500 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* INVOICE CARDS GRID */}
      {filteredItems.length === 0 ? (
        <Card className="border border-border/80 bg-card rounded-2xl shadow-xs py-16 text-center">
          <CardContent className="space-y-2">
            <Receipt className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-muted-foreground">No billing records found</p>
            <p className="text-xs text-muted-foreground font-medium">Try refining your search query.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => {
            const hasInvoice = !!item.invoiceId;
            const statusKey = item.paymentStatus ?? "pending_payment";
            const statusLabel = PAYMENT_STATUS_LABELS[statusKey] ?? statusKey;
            const statusStyle = PAYMENT_STATUS_STYLES[statusKey] ?? "bg-muted text-muted-foreground";

            return (
              <Card
                key={item.appointmentId}
                className="border border-border/80 bg-card rounded-2xl shadow-xs hover:border-cyan-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                <CardHeader className="pb-3 pt-4 px-4 bg-muted/20 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs">
                      {getInitials(item.patientName)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground leading-tight truncate max-w-[150px]">{item.patientName}</h3>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Ref: {item.referenceNo}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold uppercase border ${statusStyle}`}>
                    {statusLabel}
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 space-y-3.5">
                  <div className="text-xs space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5 text-cyan-600" /> Dentist</span>
                      <span className="font-semibold text-foreground truncate max-w-[140px]">{item.dentistName.split("(")[0]}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-cyan-600" /> Date & Time</span>
                      <span className="font-semibold text-foreground font-mono">{item.scheduledDate} · {item.scheduledTime}</span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between pt-3 border-t border-border/40">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Amount</p>
                      <p className="text-lg font-extrabold text-foreground tabular-nums">
                        {item.totalAmount !== null ? `₱${item.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—"}
                      </p>
                    </div>

                    <Link href={`/billing/${item.appointmentId}`}>
                      <Button size="sm" variant={hasInvoice ? "outline" : "default"} className={`h-9 rounded-xl text-xs font-semibold ${hasInvoice ? "border-border/80" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs"}`}>
                        {hasInvoice ? "View Billing" : "Create Invoice"}
                        <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
