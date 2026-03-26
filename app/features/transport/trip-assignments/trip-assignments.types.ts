export type AssignmentEntityType = "employee" | "resource";

/** Tipo de asignación (operativa vs facturable). Campo en Firestore: `type`. */
export type TripAssignmentKind = "operational" | "billable";

/** Alcance de la asignación sobre el viaje / paradas. */
export type TripAssignmentScopeType = "trip" | "stop" | "segment";

export interface TripAssignmentScope {
  type: TripAssignmentScopeType;
  stopId: string;
  fromStopId: string;
  toStopId: string;
  /** Texto legible: vacío si `trip`; código de parada; o `code1 - code2` en segmento. */
  display: string;
}

export interface TripAssignmentRecord {
  id: string;
  code: string;
  tripId: string;
  /** Catálogo `charge-types` (tipo de asignación). */
  chargeTypeId: string;
  type: TripAssignmentKind;
  entityType: AssignmentEntityType;
  entityId: string;
  /** Nombre del cargo (catálogo `positions`). */
  position: string;
  /** ID del documento en `positions`. */
  positionId: string;
  displayName: string;
  scope: TripAssignmentScope;
}

export interface TripAssignmentAddInput {
  chargeTypeId: string;
  type: TripAssignmentKind;
  code: string;
  tripId: string;
  entityType: AssignmentEntityType;
  entityId: string;
  position: string;
  positionId: string;
  displayName: string;
  scope: TripAssignmentScope;
}

export type TripAssignmentEditInput = Partial<Omit<TripAssignmentRecord, "id">>;
