import type {
  PivotMeasureAgg,
  ReportColumnDef,
  ReportPivotFieldRole,
  ReportRowGranularity,
} from "./reports.types";

/** Metadato de mapeo semántico → columna en la fila plana (debe alinearse con report-trips-bindings.registry.js). */
export interface TripReportBindingMeta {
  id: string;
  outputKey: string;
  granularities: ReportRowGranularity[];
  group: string;
  label: string;
  /** Origen en dominio (trip / assignment / stop / charges). */
  mapFrom: string;
  defaultHeader: string;
  defaultWidth: number;
  /** Rol en constructor pivot; si falta se infiere por `outputKey`. */
  pivotRole?: ReportPivotFieldRole;
}

export const TRIP_REPORT_BINDINGS: TripReportBindingMeta[] = [
  {
    id: "trip.row.index",
    outputKey: "no",
    granularities: ["perTrip"],
    group: "Viaje",
    label: "Número de orden",
    mapFrom: "Índice secuencial en el resultado del reporte",
    defaultHeader: "No.",
    defaultWidth: 10,
  },
  {
    id: "trip.route.display",
    outputKey: "ruta",
    granularities: ["perTrip", "perAssignment"],
    group: "Viaje",
    label: "Ruta (texto)",
    mapFrom: "trip.route",
    defaultHeader: "RUTA",
    defaultWidth: 28,
  },
  {
    id: "trip.scheduledStart.dateEs",
    outputKey: "fecha",
    granularities: ["perTrip"],
    group: "Viaje",
    label: "Fecha programada",
    mapFrom: "trip.scheduledStart (dd/mm/yyyy)",
    defaultHeader: "FECHA",
    defaultWidth: 12,
  },
  {
    id: "trip.status",
    outputKey: "status",
    granularities: ["perTrip"],
    group: "Viaje",
    label: "Estado de viaje",
    mapFrom: "trip.status",
    defaultHeader: "ESTADO",
    defaultWidth: 14,
  },
  {
    id: "trip.vehicle.plate",
    outputKey: "placa",
    granularities: ["perTrip", "perAssignment"],
    group: "Viaje",
    label: "Placa vehículo",
    mapFrom: "trip.vehicle",
    defaultHeader: "PLACA",
    defaultWidth: 14,
  },
  {
    id: "assignment.driver.displayNames.both",
    outputKey: "chofer",
    granularities: ["perTrip"],
    group: "Asignaciones",
    label: "Conductor (posición Conductor)",
    mapFrom:
      "trip-assignments: displayName con position = Conductor (employee o resource)",
    defaultHeader: "CHOFER",
    defaultWidth: 22,
  },
  {
    id: "assignment.driver.displayNames.employee",
    outputKey: "choferEmployee",
    granularities: ["perTrip"],
    group: "Asignaciones",
    label: "Conductor solo empleado",
    mapFrom: "trip-assignments: displayName (Conductor + entityType = employee)",
    defaultHeader: "CHOFER (empleado)",
    defaultWidth: 22,
  },
  {
    id: "assignment.driver.displayNames.resource",
    outputKey: "choferResource",
    granularities: ["perTrip"],
    group: "Asignaciones",
    label: "Conductor solo recurso",
    mapFrom: "trip-assignments: displayName (Conductor + entityType = resource)",
    defaultHeader: "CHOFER (recurso)",
    defaultWidth: 22,
  },
  {
    id: "trip.transportGuide",
    outputKey: "guias",
    granularities: ["perTrip", "perAssignment"],
    group: "Viaje",
    label: "Guía de transporte",
    mapFrom: "trip.transportGuide",
    defaultHeader: "GUIAS T.",
    defaultWidth: 18,
  },
  {
    id: "trip.charges.sumAmount",
    outputKey: "total",
    granularities: ["perTrip"],
    group: "Cargos",
    label: "Total cargos del viaje",
    mapFrom: "Suma trip-charges.amount (no cancelados)",
    defaultHeader: "TOTAL",
    defaultWidth: 12,
  },
  {
    id: "trip.charges.sumByChargeType.flete",
    outputKey: "totalFlete",
    granularities: ["perTrip"],
    group: "Cargos",
    label: "Total cargos por flete",
    mapFrom: "Suma trip-charges.amount donde chargeType = \"Flete\" (no cancelados)",
    defaultHeader: "TOTAL FLETE",
    defaultWidth: 12,
  },
  {
    id: "trip.charges.sumByChargeType.apoyoExtra",
    outputKey: "totalApoyoExtra",
    granularities: ["perTrip"],
    group: "Cargos",
    label: "Total cargos por apoyo extra",
    mapFrom: "Suma trip-charges.amount donde chargeType = \"Apoyo extra\" (no cancelados)",
    defaultHeader: "TOTAL APOYO EXTRA",
    defaultWidth: 14,
  },
  {
    id: "trip.transportService.note",
    outputKey: "observacion",
    granularities: ["perTrip"],
    group: "Viaje",
    label: "Observación / servicio",
    mapFrom: "trip.transportService",
    defaultHeader: "OBSERVACIÓN",
    defaultWidth: 36,
  },
  {
    id: "trip.scheduledStart.dateEs.assignmentRow",
    outputKey: "dia",
    granularities: ["perAssignment"],
    group: "Viaje",
    label: "Día",
    mapFrom: "trip.scheduledStart (dd/mm/yyyy)",
    defaultHeader: "DIA",
    defaultWidth: 8,
  },
  {
    id: "assignment.position",
    outputKey: "autoriza",
    granularities: ["perAssignment"],
    group: "Asignación",
    label: "Autoriza / posición",
    mapFrom: "trip-assignment.position",
    defaultHeader: "AUTORIZA",
    defaultWidth: 14,
  },
  {
    id: "trip.client.display",
    outputKey: "empresa",
    granularities: ["perAssignment"],
    group: "Viaje",
    label: "Empresa (cliente viaje)",
    mapFrom: "trip.client",
    defaultHeader: "EMPRESA",
    defaultWidth: 22,
  },
  {
    id: "trip.transportGuide.asDocument",
    outputKey: "documento",
    granularities: ["perAssignment"],
    group: "Viaje",
    label: "Documento / guía",
    mapFrom: "trip.transportGuide",
    defaultHeader: "DOCUMENTO",
    defaultWidth: 18,
  },
  {
    id: "stop.clientName.fallbackTripClient",
    outputKey: "cliente",
    granularities: ["perAssignment"],
    group: "Parada",
    label: "Cliente (parada o empresa)",
    mapFrom: "tripStop.name o trip.client",
    defaultHeader: "CLIENTE",
    defaultWidth: 22,
  },
  {
    id: "stop.districtName",
    outputKey: "distrito",
    granularities: ["perAssignment"],
    group: "Parada",
    label: "Distrito",
    mapFrom: "tripStop.districtName",
    defaultHeader: "DISTRITO",
    defaultWidth: 16,
  },
  {
    id: "tripstop.externalDocument",
    outputKey: "stopExternalDocument",
    granularities: ["perAssignment"],
    group: "Parada",
    label: "Documento externo (parada)",
    mapFrom: "tripStop.externalDocument",
    defaultHeader: "DOC. EXT. PARADA",
    defaultWidth: 18,
  },
  {
    id: "tripstop.observations",
    outputKey: "stopObservations",
    granularities: ["perAssignment"],
    group: "Parada",
    label: "Observaciones (parada)",
    mapFrom: "tripStop.observations",
    defaultHeader: "OBS. PARADA",
    defaultWidth: 28,
  },
  {
    id: "assignment.displayName",
    outputKey: "nombreApoyo",
    granularities: ["perAssignment"],
    group: "Asignación",
    label: "Nombre del apoyo",
    mapFrom: "trip-assignment.displayName",
    defaultHeader: "NOMBRE DEL APOYO",
    defaultWidth: 28,
  },
  {
    id: "assignment.row.quantity",
    outputKey: "cantidad",
    granularities: ["perAssignment"],
    group: "Asignación",
    label: "Cantidad",
    mapFrom: "Constante 1 por fila de asignación",
    defaultHeader: "CANTIDAD",
    defaultWidth: 10,
  },
  {
    id: "assignment.chargeType",
    outputKey: "producto",
    granularities: ["perAssignment"],
    group: "Asignación",
    label: "Producto / tipo cargo",
    mapFrom: "trip-assignment.chargeType",
    defaultHeader: "PRODUCTO",
    defaultWidth: 20,
  },
  {
    id: "assignment.scope.display",
    outputKey: "motivo",
    granularities: ["perAssignment"],
    group: "Asignación",
    label: "Motivo / alcance",
    mapFrom: "assignment.scope.display",
    defaultHeader: "MOTIVO",
    defaultWidth: 14,
  },
  {
    id: "assignment.charges.unitPriceDerived",
    outputKey: "pUni",
    granularities: ["perAssignment"],
    group: "Cargos",
    label: "Precio unitario",
    mapFrom: "pTotal / cantidad",
    defaultHeader: "P.UNI.",
    defaultWidth: 10,
  },
  {
    id: "assignment.charges.lineTotal",
    outputKey: "pTotal",
    granularities: ["perAssignment"],
    group: "Cargos",
    label: "Total línea",
    mapFrom: "Cargos por entidad de la asignación",
    defaultHeader: "P.TOTAL",
    defaultWidth: 12,
  },
];

export function getTripBindingsForGranularity(granularity: ReportRowGranularity): TripReportBindingMeta[] {
  return TRIP_REPORT_BINDINGS.filter((b) => b.granularities.includes(granularity));
}

export function getTripBindingById(id: string): TripReportBindingMeta | undefined {
  return TRIP_REPORT_BINDINGS.find((b) => b.id === id);
}

/** Primer binding que produce esa clave de fila en la granularidad dada. */
export function getBindingIdForOutputKey(
  outputKey: string,
  granularity: ReportRowGranularity
): string | undefined {
  return TRIP_REPORT_BINDINGS.find((b) => b.outputKey === outputKey && b.granularities.includes(granularity))?.id;
}

const MEASURE_OUTPUT_KEYS: Record<ReportRowGranularity, Set<string>> = {
  perTrip: new Set(["total", "totalFlete", "totalApoyoExtra"]),
  perAssignment: new Set(["cantidad", "pUni", "pTotal"]),
};

export function inferPivotRole(meta: TripReportBindingMeta, granularity: ReportRowGranularity): ReportPivotFieldRole {
  if (meta.pivotRole) return meta.pivotRole;
  return MEASURE_OUTPUT_KEYS[granularity].has(meta.outputKey) ? "measure" : "dimension";
}

/** Agregaciones numéricas típicas; `count` aplica a cualquier campo. */
const NUMERIC_AGGS: PivotMeasureAgg[] = ["sum", "avg", "min", "max"];

export function pivotAggAllowed(
  agg: PivotMeasureAgg,
  meta: TripReportBindingMeta,
  granularity: ReportRowGranularity
): boolean {
  if (agg === "count") return true;
  return inferPivotRole(meta, granularity) === "measure" && NUMERIC_AGGS.includes(agg);
}

const granLabel = (g: ReportRowGranularity): string => (g === "perTrip" ? "por viaje" : "por asignación");

/**
 * Valida columnas de un reporte con origen viajes: binding conocido, granularidad y coherencia field ↔ outputKey.
 * @returns mensaje de error o null si todo es válido.
 */
export function validateTripReportColumns(
  columns: ReportColumnDef[],
  granularity: ReportRowGranularity
): string | null {
  if (columns.length === 0) {
    return "Añade al menos una columna al reporte.";
  }
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]!;
    const field = col.field.trim();
    if (!field) {
      return `Columna ${i + 1}: el campo (clave de fila) no puede estar vacío.`;
    }
    const explicitId = col.bindingId?.trim();
    const bindingId = explicitId || getBindingIdForOutputKey(field, granularity);
    if (!bindingId) {
      return `Columna ${i + 1}: el campo "${field}" no tiene binding en el catálogo para granularidad ${granLabel(granularity)}.`;
    }
    const meta = getTripBindingById(bindingId);
    if (!meta) {
      return `Columna ${i + 1}: bindingId "${bindingId}" no existe en el catálogo.`;
    }
    if (!meta.granularities.includes(granularity)) {
      return `Columna ${i + 1}: el binding "${bindingId}" no aplica a la granularidad ${granLabel(granularity)}.`;
    }
    if (meta.outputKey !== field) {
      return `Columna ${i + 1}: el campo "${field}" debe coincidir con la clave de salida del binding (${meta.outputKey}).`;
    }
  }
  return null;
}
