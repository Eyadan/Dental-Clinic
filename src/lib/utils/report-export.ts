/**
 * Dental Clinic Management System
 * Full Analytics & Revenue Report Export Utility
 */

export interface ReportExportPayload {
  timeframeLabel: string;
  generatedAt: string;
  financialSummary: {
    totalRevenue: number;
    totalInvoiced: number;
    receivables: number;
    completedVisits: number;
    avgVisitValue: number;
    totalAppointments: number;
    completionRate: number;
    noShowRate: number;
    cancellationRate: number;
  };
  payments: {
    id: string;
    paidAt: string;
    amount: number;
    method: string;
    invoiceId: string;
  }[];
  paymentMethods: {
    method: string;
    label: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
  doctors: {
    fullName: string;
    licenseNo: string;
    specialization: string;
    totalAppointments: number;
    completedVisits: number;
    billedRevenue: number;
  }[];
  procedures: {
    name: string;
    count: number;
    totalRevenue: number;
    avgPrice: number;
  }[];
  patientTransactions?: {
    id: string;
    paidAt: string;
    patientName: string;
    patientContact: string;
    referenceNo: string;
    doctorName: string;
    procedures: string;
    method: string;
    amount: number;
    totalInvoiceAmount: number;
    remainingBalance: number;
  }[];
}

function escapeCsvCell(cell: string | number | undefined | null): string {
  if (cell === null || cell === undefined) return '""';
  const str = String(cell);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function generateReportCsv(data: ReportExportPayload): string {
  const lines: string[] = [];

  // Title & Metadata
  lines.push(escapeCsvCell("DENTAL CLINIC MANAGEMENT SYSTEM"));
  lines.push(escapeCsvCell("EXECUTIVE CLINIC ANALYTICS & REVENUE AUDIT REPORT"));
  lines.push(`Reporting Window:,${escapeCsvCell(data.timeframeLabel)}`);
  lines.push(`Generated On:,${escapeCsvCell(data.generatedAt)}`);
  lines.push("");

  // Section 1: Executive KPI Overview
  lines.push("=== SECTION 1: EXECUTIVE FINANCIAL & OPERATIONAL KPIS ===");
  lines.push("Metric,Value (PHP / Count / %)");
  lines.push(`Gross Revenue Collections,${data.financialSummary.totalRevenue.toFixed(2)}`);
  lines.push(`Total Invoiced Amount,${data.financialSummary.totalInvoiced.toFixed(2)}`);
  lines.push(`Outstanding Receivables,${data.financialSummary.receivables.toFixed(2)}`);
  lines.push(`Completed Patient Visits,${data.financialSummary.completedVisits}`);
  lines.push(`Total Scheduled Appointments,${data.financialSummary.totalAppointments}`);
  lines.push(`Average Spend Per Visit,${data.financialSummary.avgVisitValue.toFixed(2)}`);
  lines.push(`Visit Completion Rate,${data.financialSummary.completionRate}%`);
  lines.push(`No-Show Rate,${data.financialSummary.noShowRate}%`);
  lines.push(`Cancellation Rate,${data.financialSummary.cancellationRate}%`);
  lines.push("");

  // Section 2: Payment Methods Breakdown
  lines.push("=== SECTION 2: PAYMENT CHANNELS DISTRIBUTION ===");
  lines.push("Payment Channel,Transactions Count,Total Collected (PHP),Share (%)");
  for (const pm of data.paymentMethods) {
    lines.push(
      [
        escapeCsvCell(pm.label),
        pm.count,
        pm.amount.toFixed(2),
        `${pm.percentage}%`,
      ].join(",")
    );
  }
  lines.push("");

  // Section 3: Doctor Productivity
  lines.push("=== SECTION 3: DOCTOR PRODUCTIVITY & REVENUE ===");
  lines.push("Doctor Name,PRC License No,Specialization,Total Appointments,Completed Visits,Billed Revenue (PHP)");
  for (const doc of data.doctors) {
    lines.push(
      [
        escapeCsvCell(doc.fullName),
        escapeCsvCell(doc.licenseNo),
        escapeCsvCell(doc.specialization),
        doc.totalAppointments,
        doc.completedVisits,
        doc.billedRevenue.toFixed(2),
      ].join(",")
    );
  }
  lines.push("");

  // Section 4: Top Procedures by Revenue
  lines.push("=== SECTION 4: DENTAL PROCEDURES RANKED BY REVENUE ===");
  lines.push("Procedure Name,Times Performed,Total Revenue (PHP),Average Price (PHP)");
  for (const proc of data.procedures) {
    lines.push(
      [
        escapeCsvCell(proc.name),
        proc.count,
        proc.totalRevenue.toFixed(2),
        proc.avgPrice.toFixed(2),
      ].join(",")
    );
  }
  lines.push("");

  // Section 5: Detailed Patient Transactions & Payments Audit Log
  lines.push("=== SECTION 5: PATIENT TRANSACTIONS & BILLING AUDIT LEDGER ===");
  if (data.patientTransactions && data.patientTransactions.length > 0) {
    lines.push("Patient Full Name,Contact No,Appointment Ref,Date & Time,Attending Doctor,Dental Procedures,Payment Channel,Amount Paid (PHP),Invoice Total (PHP),Remaining Balance (PHP),Payment ID");
    for (const pt of data.patientTransactions) {
      lines.push(
        [
          escapeCsvCell(pt.patientName),
          escapeCsvCell(pt.patientContact),
          escapeCsvCell(pt.referenceNo),
          escapeCsvCell(pt.paidAt),
          escapeCsvCell(pt.doctorName),
          escapeCsvCell(pt.procedures),
          escapeCsvCell(pt.method.toUpperCase()),
          pt.amount.toFixed(2),
          pt.totalInvoiceAmount.toFixed(2),
          pt.remainingBalance.toFixed(2),
          escapeCsvCell(pt.id),
        ].join(",")
      );
    }
  } else {
    lines.push("Payment ID,Transaction Date & Time,Payment Channel,Amount (PHP),Invoice ID");
    for (const p of data.payments) {
      lines.push(
        [
          escapeCsvCell(p.id),
          escapeCsvCell(p.paidAt),
          escapeCsvCell(p.method.toUpperCase()),
          p.amount.toFixed(2),
          escapeCsvCell(p.invoiceId),
        ].join(",")
      );
    }
  }

  return lines.join("\r\n");
}

export function downloadReportCsv(data: ReportExportPayload, filename?: string): void {
  const csvString = generateReportCsv(data);
  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const sanitizedDate = new Date().toISOString().split("T")[0];
  link.href = url;
  link.download = filename || `dental_clinic_full_report_${sanitizedDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadExcelFromBase64(base64: string, filename: string): void {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
