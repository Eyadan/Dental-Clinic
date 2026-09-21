import ExcelJS from "exceljs";
import type { ReportExportPayload } from "@/lib/utils/report-export";

/**
 * Generates an executive, beautifully styled Microsoft Excel (.xlsx) workbook.
 * Contains 4 distinct worksheets with corporate branding, custom colors,
 * zebra striping, currency/percentage number formatting, and formula totals.
 */
export async function generateStyledExcelReportBuffer(data: ReportExportPayload): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Dental Clinic Management System";
  workbook.lastModifiedBy = "Dental Clinic Administrator";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Color Palette Constants (ARGB format without '#')
  const COLORS = {
    primaryDark: "FF0E7490",   // Deep Cyan
    primaryMedium: "FF0891B2", // Cyan 600
    navyHeader: "FF1E293B",    // Slate 800
    tealHeader: "FF0F766E",    // Teal 700
    indigoHeader: "FF4338CA",  // Indigo 700
    emeraldText: "FF047857",   // Emerald 700
    emeraldBg: "FFECFDF5",     // Emerald 50
    amberText: "FFB45309",     // Amber 700
    amberBg: "FFFFFBEB",       // Amber 50
    blueText: "FF1D4ED8",      // Blue 700
    blueBg: "FFEFF6FF",        // Blue 50
    zebraRow: "FFF8FAFC",      // Slate 50
    borderLight: "FFE2E8F0",   // Slate 200
    white: "FFFFFFFF",
    black: "FF000000",
    textMuted: "FF64748B",     // Slate 500
  };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: COLORS.borderLight } },
    left: { style: "thin", color: { argb: COLORS.borderLight } },
    bottom: { style: "thin", color: { argb: COLORS.borderLight } },
    right: { style: "thin", color: { argb: COLORS.borderLight } },
  };

  const doubleBottomBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: COLORS.navyHeader } },
    bottom: { style: "double", color: { argb: COLORS.navyHeader } },
  };

  // -------------------------------------------------------------
  // TAB 1: EXECUTIVE SUMMARY
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet("Executive Summary", {
    views: [{ showGridLines: true }],
  });

  // Title Header Banner
  summarySheet.mergeCells("A1:D2");
  const mainTitleCell = summarySheet.getCell("A1");
  mainTitleCell.value = "DENTAL CLINIC MANAGEMENT SYSTEM";
  mainTitleCell.font = { name: "Segoe UI", size: 15, bold: true, color: { argb: COLORS.white } };
  mainTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.primaryDark } };
  mainTitleCell.alignment = { horizontal: "center", vertical: "middle" };

  summarySheet.mergeCells("A3:D3");
  const subTitleCell = summarySheet.getCell("A3");
  subTitleCell.value = "EXECUTIVE CLINIC ANALYTICS & REVENUE AUDIT REPORT";
  subTitleCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.white } };
  subTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.primaryMedium } };
  subTitleCell.alignment = { horizontal: "center", vertical: "middle" };

  summarySheet.mergeCells("A4:D4");
  const metaCell = summarySheet.getCell("A4");
  metaCell.value = `Reporting Window: ${data.timeframeLabel.toUpperCase()}  |  Generated: ${data.generatedAt}`;
  metaCell.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: COLORS.textMuted } };
  metaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.zebraRow } };
  metaCell.alignment = { horizontal: "center", vertical: "middle" };

  // Section 1 Header
  summarySheet.mergeCells("A6:D6");
  const kpiHeader = summarySheet.getCell("A6");
  kpiHeader.value = "1. EXECUTIVE FINANCIAL & OPERATIONAL KPIS";
  kpiHeader.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: COLORS.white } };
  kpiHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navyHeader } };
  kpiHeader.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  summarySheet.getRow(6).height = 24;

  const kpis = [
    { label: "Gross Revenue Collections (PHP)", val: data.financialSummary.totalRevenue, format: '"₱"#,##0.00', bold: true, color: COLORS.emeraldText, bg: COLORS.emeraldBg },
    { label: "Total Invoiced Amount (PHP)", val: data.financialSummary.totalInvoiced, format: '"₱"#,##0.00', bold: true },
    { label: "Outstanding Patient Receivables (PHP)", val: data.financialSummary.receivables, format: '"₱"#,##0.00', bold: true, color: COLORS.amberText, bg: COLORS.amberBg },
    { label: "Completed Patient Visits", val: data.financialSummary.completedVisits, format: '#,##0', bold: true, color: COLORS.blueText, bg: COLORS.blueBg },
    { label: "Total Scheduled Appointments", val: data.financialSummary.totalAppointments, format: '#,##0' },
    { label: "Average Revenue Spend per Visit (PHP)", val: data.financialSummary.avgVisitValue, format: '"₱"#,##0.00', bold: true },
    { label: "Visit Completion Rate", val: data.financialSummary.completionRate / 100, format: '0.0%' },
    { label: "Patient No-Show Rate", val: data.financialSummary.noShowRate / 100, format: '0.0%' },
    { label: "Appointment Cancellation Rate", val: data.financialSummary.cancellationRate / 100, format: '0.0%' },
  ];

  let currentRow = 7;
  for (const kpi of kpis) {
    summarySheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const lblCell = summarySheet.getCell(`A${currentRow}`);
    lblCell.value = kpi.label;
    lblCell.font = { name: "Segoe UI", size: 10, bold: kpi.bold ?? false };
    lblCell.alignment = { vertical: "middle", indent: 1 };
    lblCell.border = thinBorder;
    if (kpi.bg) {
      lblCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: kpi.bg } };
    }

    const valCell = summarySheet.getCell(`D${currentRow}`);
    valCell.value = kpi.val;
    valCell.numFmt = kpi.format;
    valCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: kpi.color || COLORS.black } };
    valCell.alignment = { horizontal: "right", vertical: "middle" };
    valCell.border = thinBorder;
    if (kpi.bg) {
      valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: kpi.bg } };
    }

    summarySheet.getRow(currentRow).height = 20;
    currentRow++;
  }

  // Section 2 Header
  currentRow++;
  summarySheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const payHeader = summarySheet.getCell(`A${currentRow}`);
  payHeader.value = "2. PAYMENT CHANNELS DISTRIBUTION";
  payHeader.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: COLORS.white } };
  payHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navyHeader } };
  payHeader.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  summarySheet.getRow(currentRow).height = 24;
  currentRow++;

  const paySubHeaders = ["Payment Channel", "Transactions", "Total Collected (PHP)", "Share (%)"];
  const subRow = summarySheet.getRow(currentRow);
  subRow.values = paySubHeaders;
  subRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.primaryMedium } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });
  subRow.height = 20;
  currentRow++;

  const payStartRow = currentRow;
  for (const pm of data.paymentMethods) {
    const row = summarySheet.getRow(currentRow);
    row.values = [pm.label, pm.count, pm.amount, pm.percentage / 100];
    row.getCell(1).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(3).numFmt = '"₱"#,##0.00';
    row.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(4).numFmt = '0.0%';

    row.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 10 };
      cell.border = thinBorder;
      if (currentRow % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.zebraRow } };
      }
    });
    row.height = 19;
    currentRow++;
  }

  const payTotalRow = summarySheet.getRow(currentRow);
  payTotalRow.values = [
    "TOTAL",
    { formula: `SUM(B${payStartRow}:B${currentRow - 1})` },
    { formula: `SUM(C${payStartRow}:C${currentRow - 1})` },
    1.0,
  ];
  payTotalRow.getCell(1).font = { name: "Segoe UI", size: 10, bold: true };
  payTotalRow.getCell(1).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  payTotalRow.getCell(2).font = { name: "Segoe UI", size: 10, bold: true };
  payTotalRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
  payTotalRow.getCell(3).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.emeraldText } };
  payTotalRow.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
  payTotalRow.getCell(3).numFmt = '"₱"#,##0.00';
  payTotalRow.getCell(4).font = { name: "Segoe UI", size: 10, bold: true };
  payTotalRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
  payTotalRow.getCell(4).numFmt = '0.0%';
  payTotalRow.eachCell((cell) => {
    cell.border = doubleBottomBorder;
  });
  payTotalRow.height = 22;

  summarySheet.getColumn(1).width = 38;
  summarySheet.getColumn(2).width = 20;
  summarySheet.getColumn(3).width = 26;
  summarySheet.getColumn(4).width = 20;

  // -------------------------------------------------------------
  // TAB 2: PATIENT TRANSACTIONS & BILLING AUDIT LEDGER
  // -------------------------------------------------------------
  const hasPatientTx = Boolean(data.patientTransactions && data.patientTransactions.length > 0);
  const sheetName = hasPatientTx ? "Patient Transactions" : "Payments Audit Ledger";

  const paymentsSheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true, state: "frozen", ySplit: 4 }],
  });

  const txCount = hasPatientTx ? (data.patientTransactions?.length || 0) : data.payments.length;
  const lastColLetter = hasPatientTx ? "K" : "E";

  paymentsSheet.mergeCells(`A1:${lastColLetter}2`);
  const pBanner = paymentsSheet.getCell("A1");
  pBanner.value = hasPatientTx
    ? "DETAILED PATIENT TRANSACTIONS & BILLING AUDIT LEDGER"
    : "DETAILED PAYMENTS TRANSACTION AUDIT LEDGER";
  pBanner.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: COLORS.white } };
  pBanner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.primaryDark } };
  pBanner.alignment = { horizontal: "center", vertical: "middle" };

  paymentsSheet.mergeCells(`A3:${lastColLetter}3`);
  const pSub = paymentsSheet.getCell("A3");
  pSub.value = `Reporting Window: ${data.timeframeLabel.toUpperCase()}  |  Total Transactions: ${txCount}`;
  pSub.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: COLORS.textMuted } };
  pSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.zebraRow } };
  pSub.alignment = { horizontal: "center", vertical: "middle" };

  if (hasPatientTx && data.patientTransactions) {
    const pHeaders = [
      "Patient Full Name",
      "Contact No",
      "Appointment Ref",
      "Date & Time",
      "Attending Doctor",
      "Dental Procedures",
      "Payment Channel",
      "Amount Paid (PHP)",
      "Invoice Total (PHP)",
      "Remaining Balance (PHP)",
      "Transaction ID",
    ];
    const pHeaderRow = paymentsSheet.getRow(4);
    pHeaderRow.values = pHeaders;
    pHeaderRow.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navyHeader } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder;
    });
    pHeaderRow.height = 24;

    let pRowIdx = 5;
    for (const pt of data.patientTransactions) {
      const row = paymentsSheet.getRow(pRowIdx);
      const paidDateFormatted = pt.paidAt
        ? new Date(pt.paidAt).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })
        : "N/A";

      row.values = [
        pt.patientName,
        pt.patientContact,
        pt.referenceNo,
        paidDateFormatted,
        pt.doctorName,
        pt.procedures,
        pt.method.toUpperCase(),
        pt.amount,
        pt.totalInvoiceAmount,
        pt.remainingBalance,
        pt.id,
      ];

      row.getCell(1).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      row.getCell(1).font = { name: "Segoe UI", size: 10, bold: true };

      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(2).font = { name: "Consolas", size: 9 };

      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(3).font = { name: "Consolas", size: 9, bold: true, color: { argb: COLORS.tealHeader } };

      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).font = { name: "Segoe UI", size: 9 };

      row.getCell(5).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      row.getCell(5).font = { name: "Segoe UI", size: 9 };

      row.getCell(6).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      row.getCell(6).font = { name: "Segoe UI", size: 9 };

      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(7).font = { name: "Segoe UI", size: 9, bold: true };

      row.getCell(8).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(8).numFmt = '"₱"#,##0.00';
      row.getCell(8).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.emeraldText } };

      row.getCell(9).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(9).numFmt = '"₱"#,##0.00';
      row.getCell(9).font = { name: "Segoe UI", size: 9 };

      row.getCell(10).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(10).numFmt = '"₱"#,##0.00';
      row.getCell(10).font = {
        name: "Segoe UI",
        size: 9,
        bold: pt.remainingBalance > 0,
        color: { argb: pt.remainingBalance > 0 ? COLORS.amberText : COLORS.textMuted },
      };

      row.getCell(11).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(11).font = { name: "Consolas", size: 8, color: { argb: COLORS.textMuted } };

      row.eachCell((cell) => {
        cell.border = thinBorder;
        if (pRowIdx % 2 === 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.zebraRow } };
        }
      });
      row.height = 20;
      pRowIdx++;
    }

    if (data.patientTransactions.length > 0) {
      const pTotal = paymentsSheet.getRow(pRowIdx);
      pTotal.values = [
        "TOTAL AUDIT SUMMARY",
        "",
        `${data.patientTransactions.length} Transactions`,
        "",
        "",
        "",
        "",
        { formula: `SUM(H5:H${pRowIdx - 1})` },
        { formula: `SUM(I5:I${pRowIdx - 1})` },
        { formula: `SUM(J5:J${pRowIdx - 1})` },
        "",
      ];
      pTotal.getCell(1).font = { name: "Segoe UI", size: 10, bold: true };
      pTotal.getCell(3).font = { name: "Segoe UI", size: 9, bold: true };
      pTotal.getCell(3).alignment = { horizontal: "center", vertical: "middle" };

      pTotal.getCell(8).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: COLORS.emeraldText } };
      pTotal.getCell(8).alignment = { horizontal: "right", vertical: "middle" };
      pTotal.getCell(8).numFmt = '"₱"#,##0.00';

      pTotal.getCell(9).font = { name: "Segoe UI", size: 10, bold: true };
      pTotal.getCell(9).alignment = { horizontal: "right", vertical: "middle" };
      pTotal.getCell(9).numFmt = '"₱"#,##0.00';

      pTotal.getCell(10).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.amberText } };
      pTotal.getCell(10).alignment = { horizontal: "right", vertical: "middle" };
      pTotal.getCell(10).numFmt = '"₱"#,##0.00';

      pTotal.eachCell((cell) => {
        cell.border = doubleBottomBorder;
      });
      pTotal.height = 24;
    }

    paymentsSheet.getColumn(1).width = 28;
    paymentsSheet.getColumn(2).width = 16;
    paymentsSheet.getColumn(3).width = 18;
    paymentsSheet.getColumn(4).width = 20;
    paymentsSheet.getColumn(5).width = 24;
    paymentsSheet.getColumn(6).width = 34;
    paymentsSheet.getColumn(7).width = 18;
    paymentsSheet.getColumn(8).width = 22;
    paymentsSheet.getColumn(9).width = 20;
    paymentsSheet.getColumn(10).width = 22;
    paymentsSheet.getColumn(11).width = 36;
  } else {
    const pHeaders = ["Payment ID", "Transaction Date & Time", "Payment Channel", "Amount Paid (PHP)", "Invoice Reference ID"];
    const pHeaderRow = paymentsSheet.getRow(4);
    pHeaderRow.values = pHeaders;
    pHeaderRow.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navyHeader } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = thinBorder;
    });
    pHeaderRow.height = 24;

    let pRowIdx = 5;
    for (const p of data.payments) {
      const row = paymentsSheet.getRow(pRowIdx);
      row.values = [
        p.id,
        new Date(p.paidAt).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" }),
        p.method.toUpperCase(),
        p.amount,
        p.invoiceId,
      ];

      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(1).font = { name: "Consolas", size: 9, color: { argb: COLORS.textMuted } };
      row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(4).numFmt = '"₱"#,##0.00';
      row.getCell(4).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.emeraldText } };
      row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(5).font = { name: "Consolas", size: 9, color: { argb: COLORS.textMuted } };

      row.eachCell((cell) => {
        cell.border = thinBorder;
        if (pRowIdx % 2 === 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.zebraRow } };
        }
      });
      row.height = 20;
      pRowIdx++;
    }

    if (data.payments.length > 0) {
      const pTotal = paymentsSheet.getRow(pRowIdx);
      pTotal.values = [
        "TOTAL RECORDED PAYMENTS",
        "",
        `${data.payments.length} Transactions`,
        { formula: `SUM(D5:D${pRowIdx - 1})` },
        "",
      ];
      pTotal.getCell(1).font = { name: "Segoe UI", size: 10, bold: true };
      pTotal.getCell(3).font = { name: "Segoe UI", size: 10, bold: true };
      pTotal.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
      pTotal.getCell(4).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: COLORS.emeraldText } };
      pTotal.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
      pTotal.getCell(4).numFmt = '"₱"#,##0.00';
      pTotal.eachCell((cell) => {
        cell.border = doubleBottomBorder;
      });
      pTotal.height = 24;
    }

    paymentsSheet.getColumn(1).width = 40;
    paymentsSheet.getColumn(2).width = 24;
    paymentsSheet.getColumn(3).width = 20;
    paymentsSheet.getColumn(4).width = 24;
    paymentsSheet.getColumn(5).width = 40;
  }

  // -------------------------------------------------------------
  // TAB 3: DOCTOR PRODUCTIVITY
  // -------------------------------------------------------------
  const docSheet = workbook.addWorksheet("Doctor Productivity", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 4 }],
  });

  docSheet.mergeCells("A1:F2");
  const docBanner = docSheet.getCell("A1");
  docBanner.value = "CLINIC PRACTITIONER PRODUCTIVITY & BILLED REVENUE";
  docBanner.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: COLORS.white } };
  docBanner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.tealHeader } };
  docBanner.alignment = { horizontal: "center", vertical: "middle" };

  docSheet.mergeCells("A3:F3");
  const docSub = docSheet.getCell("A3");
  docSub.value = `Reporting Window: ${data.timeframeLabel.toUpperCase()}  |  Practitioners: ${data.doctors.length}`;
  docSub.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: COLORS.textMuted } };
  docSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.zebraRow } };
  docSub.alignment = { horizontal: "center", vertical: "middle" };

  const docHeaders = ["Doctor Full Name", "PRC License No", "Specialization", "Scheduled Visits", "Completed Visits", "Total Billed Revenue (PHP)"];
  const docHeaderRow = docSheet.getRow(4);
  docHeaderRow.values = docHeaders;
  docHeaderRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.tealHeader } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });
  docHeaderRow.height = 24;

  let docRowIdx = 5;
  for (const doc of data.doctors) {
    const row = docSheet.getRow(docRowIdx);
    row.values = [
      doc.fullName,
      doc.licenseNo,
      doc.specialization,
      doc.totalAppointments,
      doc.completedVisits,
      doc.billedRevenue,
    ];

    row.getCell(1).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    row.getCell(1).font = { name: "Segoe UI", size: 10, bold: true };
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(3).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(5).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.blueText } };
    row.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(6).numFmt = '"₱"#,##0.00';
    row.getCell(6).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.emeraldText } };

    row.eachCell((cell) => {
      cell.border = thinBorder;
      if (docRowIdx % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.zebraRow } };
      }
    });
    row.height = 20;
    docRowIdx++;
  }

  if (data.doctors.length > 0) {
    const docTotal = docSheet.getRow(docRowIdx);
    docTotal.values = [
      "TOTAL CLINIC PERFORMANCE",
      "",
      "",
      { formula: `SUM(D5:D${docRowIdx - 1})` },
      { formula: `SUM(E5:E${docRowIdx - 1})` },
      { formula: `SUM(F5:F${docRowIdx - 1})` },
    ];
    docTotal.getCell(1).font = { name: "Segoe UI", size: 10, bold: true };
    docTotal.getCell(4).font = { name: "Segoe UI", size: 10, bold: true };
    docTotal.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    docTotal.getCell(5).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.blueText } };
    docTotal.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    docTotal.getCell(6).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: COLORS.emeraldText } };
    docTotal.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
    docTotal.getCell(6).numFmt = '"₱"#,##0.00';
    docTotal.eachCell((cell) => {
      cell.border = doubleBottomBorder;
    });
    docTotal.height = 24;
  }

  docSheet.getColumn(1).width = 28;
  docSheet.getColumn(2).width = 18;
  docSheet.getColumn(3).width = 28;
  docSheet.getColumn(4).width = 20;
  docSheet.getColumn(5).width = 20;
  docSheet.getColumn(6).width = 28;

  // -------------------------------------------------------------
  // TAB 4: PROCEDURE CATALOG REVENUE
  // -------------------------------------------------------------
  const procSheet = workbook.addWorksheet("Procedure Catalog Revenue", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 4 }],
  });

  procSheet.mergeCells("A1:E2");
  const procBanner = procSheet.getCell("A1");
  procBanner.value = "PROCEDURE CATALOG VOLUME & REVENUE RANKING";
  procBanner.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: COLORS.white } };
  procBanner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.indigoHeader } };
  procBanner.alignment = { horizontal: "center", vertical: "middle" };

  procSheet.mergeCells("A3:E3");
  const procSub = procSheet.getCell("A3");
  procSub.value = `Reporting Window: ${data.timeframeLabel.toUpperCase()}  |  Ranked by Revenue Volume`;
  procSub.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: COLORS.textMuted } };
  procSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.zebraRow } };
  procSub.alignment = { horizontal: "center", vertical: "middle" };

  const procHeaders = ["Rank", "Procedure Service Name", "Times Performed", "Average Price (PHP)", "Total Revenue (PHP)"];
  const procHeaderRow = procSheet.getRow(4);
  procHeaderRow.values = procHeaders;
  procHeaderRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.indigoHeader } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });
  procHeaderRow.height = 24;

  let procRowIdx = 5;
  data.procedures.forEach((proc, index) => {
    const row = procSheet.getRow(procRowIdx);
    row.values = [
      `#${index + 1}`,
      proc.name,
      proc.count,
      proc.avgPrice,
      proc.totalRevenue,
    ];

    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(1).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.primaryDark } };
    row.getCell(2).alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    row.getCell(2).font = { name: "Segoe UI", size: 10, bold: true };
    row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(4).numFmt = '"₱"#,##0.00';
    row.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(5).numFmt = '"₱"#,##0.00';
    row.getCell(5).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: COLORS.emeraldText } };

    row.eachCell((cell) => {
      cell.border = thinBorder;
      if (procRowIdx % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.zebraRow } };
      }
    });
    row.height = 20;
    procRowIdx++;
  });

  if (data.procedures.length > 0) {
    const procTotal = procSheet.getRow(procRowIdx);
    procTotal.values = [
      "TOTAL",
      `${data.procedures.length} Procedures`,
      { formula: `SUM(C5:C${procRowIdx - 1})` },
      "",
      { formula: `SUM(E5:E${procRowIdx - 1})` },
    ];
    procTotal.getCell(1).font = { name: "Segoe UI", size: 10, bold: true };
    procTotal.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    procTotal.getCell(2).font = { name: "Segoe UI", size: 10, bold: true };
    procTotal.getCell(3).font = { name: "Segoe UI", size: 10, bold: true };
    procTotal.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    procTotal.getCell(5).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: COLORS.emeraldText } };
    procTotal.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
    procTotal.getCell(5).numFmt = '"₱"#,##0.00';
    procTotal.eachCell((cell) => {
      cell.border = doubleBottomBorder;
    });
    procTotal.height = 24;
  }

  procSheet.getColumn(1).width = 12;
  procSheet.getColumn(2).width = 36;
  procSheet.getColumn(3).width = 20;
  procSheet.getColumn(4).width = 24;
  procSheet.getColumn(5).width = 28;

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
