export * from "./sunat-monitor.types";
export * from "./sunat-monitor.service";

export const SUNAT_JOB_STATUS = {
  queued: { label: "En cola", severity: "info" },
  processing: { label: "Procesando", severity: "warning" },
  accepted: { label: "Aceptado", severity: "success" },
  rejected: { label: "Rechazado", severity: "danger" },
  error: { label: "Error", severity: "danger" },
  failed: { label: "Fallido", severity: "danger" },
} as const;

export const SUNAT_JOB_TYPE = {
  sendBill: { label: "Envío (Factura)", severity: "info" },
  sendPack: { label: "Envío masivo (Pack)", severity: "warning" },
  sendSummary: { label: "Resumen diario", severity: "secondary" },
} as const;

