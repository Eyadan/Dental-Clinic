"use server";

import type { ReportExportPayload } from "@/lib/utils/report-export";
import { generateStyledExcelReportBuffer } from "@/lib/services/excel-export-service";
import type { ServiceResult } from "@/lib/services/base-service";

export async function exportReportToExcelAction(
  data: ReportExportPayload
): Promise<ServiceResult<{ base64: string; filename: string }>> {
  try {
    const buffer = await generateStyledExcelReportBuffer(data);
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `dental_clinic_executive_report_${dateStr}.xlsx`;

    return {
      success: true,
      data: {
        base64: buffer.toString("base64"),
        filename,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate Excel report",
    };
  }
}
