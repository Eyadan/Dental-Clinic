"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Receipt, Search } from "lucide-react";

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
  pending_payment: "bg-yellow-100 text-yellow-800",
  partially_paid: "bg-orange-100 text-orange-800",
  paid: "bg-green-100 text-green-800",
  payment_failed: "bg-red-100 text-red-800",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending Payment",
  partially_paid: "Partially Paid",
  paid: "Paid",
  payment_failed: "Payment Failed",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function BillingListClient({ items }: BillingListClientProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.patientName.toLowerCase().includes(q) ||
        item.referenceNo.toLowerCase().includes(q) ||
        item.dentistName.toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          View and manage invoices for appointments
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by patient, reference, or dentist..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {search.trim()
                ? "No billing records match your search."
                : "No appointments with billing records yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Appointments ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Reference</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Dentist</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.appointmentId}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/billing/${item.appointmentId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {item.referenceNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{item.patientName}</td>
                      <td className="px-4 py-3">{item.dentistName}</td>
                      <td className="px-4 py-3">
                        {formatDate(item.scheduledDate)}
                        {item.scheduledTime && (
                          <span className="text-muted-foreground"> {item.scheduledTime}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {item.totalAmount !== null
                          ? formatCurrency(item.totalAmount)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {item.paymentStatus ? (
                          <Badge
                            variant="secondary"
                            className={PAYMENT_STATUS_STYLES[item.paymentStatus] ?? ""}
                          >
                            {PAYMENT_STATUS_LABELS[item.paymentStatus] ?? item.paymentStatus}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No Invoice</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
