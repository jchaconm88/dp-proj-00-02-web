import raw from "./peru-districts.json";

export type PeruDistrict = { id: string; name: string };

const data = raw as { districts: PeruDistrict[] };

/** Lista de distritos (UBIGEO 6 dígitos + nombre). Ampliar en `peru-districts.json`. */
export const PERU_DISTRICTS: readonly PeruDistrict[] = data.districts;

export function getDistrictNameById(id: string): string {
  const t = id.trim();
  if (!t) return "";
  return PERU_DISTRICTS.find((d) => d.id === t)?.name ?? "";
}

/** Opciones para Prime/DpInput select (value = UBIGEO). */
export function peruDistrictSelectOptions(): { label: string; value: string }[] {
  return PERU_DISTRICTS.map((d) => ({
    label: `${d.name} (${d.id})`,
    value: d.id,
  }));
}
