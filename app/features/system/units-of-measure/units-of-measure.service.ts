import { webFetch } from "~/lib/backend-client";
import type { DenormalizedUnitFields, UnitOfMeasureRecord } from "./units-of-measure.types";

/** Opciones de `DpInput type="select"` a partir del catálogo GET. */
export function unitsCatalogToSelectOptions(
  catalog: UnitOfMeasureRecord[]
): { label: string; value: string }[] {
  return catalog.map((u) => ({
    value: u.code,
    label: `${u.name} (${u.abbreviation})`,
  }));
}

export function denormalizedUnitFromApi(doc: Record<string, unknown>): DenormalizedUnitFields {
  const code = String(doc.unitOfMeasureCode ?? doc.unitOfMeasure ?? "").trim();
  return {
    unitOfMeasureId: String(doc.unitOfMeasureId ?? code),
    unitOfMeasureCode: code,
    unitOfMeasureName: String(doc.unitOfMeasureName ?? ""),
    unitOfMeasureAbbreviation: String(doc.unitOfMeasureAbbreviation ?? ""),
    unitOfMeasureSunatCode: String(doc.unitOfMeasureSunatCode ?? ""),
    unitOfMeasureSunatName: String(doc.unitOfMeasureSunatName ?? ""),
  };
}

export async function getUnitsOfMeasureCatalog(): Promise<UnitOfMeasureRecord[]> {
  const result = await webFetch<{ items: UnitOfMeasureRecord[] }>("/system/units-of-measure");
  return Array.isArray(result.items) ? result.items : [];
}
