import type { ReportOutputFormat, ReportTemplateId } from "./reports.types";

export interface CreateReportRunParams {
  dateFrom: string;
  dateTo: string;
  /** Sobrescribe la plantilla de la definición. */
  templateId?: ReportTemplateId;
  outputFormat?: ReportOutputFormat;
  /** Destinatarios extra para esta corrida (se unen con los de la definición). */
  notifyEmails?: string[];
  notifyEmailSubjectTemplate?: string;
  notifyEmailBodyHtml?: string;
  includeSubtotalsIgft?: boolean;
  reportTitle?: string;
  trigger?: "manual" | "scheduled";
}

export interface CreateReportRunRequest {
  reportDefinitionId: string;
  params: CreateReportRunParams;
}

export interface CreateReportRunResponse {
  reportRunId: string;
}

export interface GetReportRunDownloadUrlRequest {
  reportRunId: string;
}

export interface GetReportRunDownloadUrlResponse {
  url: string;
  fileName: string;
}

export interface PreviewReportPivotParams {
  dateFrom: string;
  dateTo: string;
}

export interface PreviewReportPivotRequest {
  reportDefinitionId: string;
  params: PreviewReportPivotParams;
}

export interface PreviewReportPivotColumnMeta {
  field: string;
  header: string;
}

export interface PreviewReportPivotResponse {
  columns: PreviewReportPivotColumnMeta[];
  rows: Record<string, unknown>[];
  truncatedInput: boolean;
  truncatedOutput?: boolean;
  inputRowCount: number;
  outputRowCount: number;
}
