import type { ProductionOrderRecord } from "~/features/production";

export const ORDER_STATUS_OPTIONS = {
  borrador: { label: "Borrador", severity: "secondary" as const },
  planificada: { label: "Planificada", severity: "info" as const },
  en_proceso: { label: "En proceso", severity: "warning" as const },
  completada: { label: "Completada", severity: "success" as const },
  cancelada: { label: "Cancelada", severity: "danger" as const },
};

export function getAvailableTransitions(status: string): { label: string; target: string }[] {
  const map: Record<string, { label: string; target: string }[]> = {
    borrador: [{ label: "Planificar", target: "planificada" }],
    planificada: [
      { label: "Iniciar producción", target: "en_proceso" },
      { label: "Cancelar", target: "cancelada" },
    ],
    en_proceso: [
      { label: "Completar", target: "completada" },
      { label: "Cancelar", target: "cancelada" },
    ],
  };
  return map[status] ?? [];
}

export function canEditOrder(row: ProductionOrderRecord): boolean {
  return row.status === "borrador" || row.status === "planificada";
}

export function canDeleteOrder(row: ProductionOrderRecord): boolean {
  return row.status === "borrador";
}
