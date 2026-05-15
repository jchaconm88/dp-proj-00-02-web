/** Catálogo de unidades (respuesta GET /system/units-of-measure). */
export interface UnitOfMeasureRecord {
  id: string;
  code: string;
  name: string;
  abbreviation: string;
  sunatCode: string;
  sunatName: string;
}

/** Campos denormalizados persistidos en productos e ítems (respuestas API). */
export interface DenormalizedUnitFields {
  unitOfMeasureId: string;
  unitOfMeasureCode: string;
  unitOfMeasureName: string;
  unitOfMeasureAbbreviation: string;
  /** UN/ECE rec 20; persistido para facturación / comprobantes. */
  unitOfMeasureSunatCode: string;
  unitOfMeasureSunatName: string;
}
