import { useMemo } from "react";
import { MultiSelect } from "primereact/multiselect";
import type { FilterableAttributeTypeRecord } from "~/features/inventory/filterable-attribute-types";

export interface FilterableAttributesSectionProps {
  value: Record<string, string[]>;
  onChange: (attrs: Record<string, string[]>) => void;
  attributeTypes: FilterableAttributeTypeRecord[];
  disabled?: boolean;
}

/**
 * Sección de atributos filtrables para el formulario de producto.
 * Muestra una fila por cada tipo de atributo filtrable activo (ordenado por sortOrder),
 * más filas disabled para tipos inactivos que ya están asignados al producto.
 * Valores huérfanos (removidos del catálogo) muestran un warning inline.
 */
export default function FilterableAttributesSection({
  value,
  onChange,
  attributeTypes,
  disabled = false,
}: FilterableAttributesSectionProps) {
  // Build a map of attribute types by code for quick lookup
  const typesByCode = useMemo(() => {
    const map = new Map<string, FilterableAttributeTypeRecord>();
    for (const t of attributeTypes) {
      map.set(t.code, t);
    }
    return map;
  }, [attributeTypes]);

  // Determine which rows to show:
  // 1. Active types ordered by sortOrder
  // 2. Inactive types that are already assigned to the product
  const rows = useMemo(() => {
    const activeTypes = attributeTypes
      .filter((t) => t.active)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    // Inactive types that have values assigned in the product
    const inactiveAssigned = attributeTypes
      .filter((t) => !t.active && value[t.code] && value[t.code].length > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return [...activeTypes, ...inactiveAssigned];
  }, [attributeTypes, value]);

  // Detect orphaned values: codes in value that have no matching type in the catalog
  const orphanedCodes = useMemo(() => {
    const codes: string[] = [];
    for (const code of Object.keys(value)) {
      if (!typesByCode.has(code) && value[code].length > 0) {
        codes.push(code);
      }
    }
    return codes;
  }, [value, typesByCode]);

  const handleChange = (code: string, selected: string[]) => {
    const next = { ...value, [code]: selected };
    // Remove entry if empty
    if (selected.length === 0) {
      delete next[code];
    }
    onChange(next);
  };

  if (rows.length === 0 && orphanedCodes.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No hay tipos de atributos filtrables configurados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((attrType) => {
        const isInactive = !attrType.active;
        const currentValues = value[attrType.code] ?? [];
        const catalogValues = attrType.values;

        // Detect orphaned values within this type (values assigned but no longer in catalog)
        const orphanedValues = currentValues.filter((v) => !catalogValues.includes(v));

        // Build options: catalog values + orphaned values (so they remain visible)
        const options = [
          ...catalogValues.map((v) => ({ label: v, value: v })),
          ...orphanedValues.map((v) => ({ label: `${v} ⚠️`, value: v })),
        ];

        const label = isInactive
          ? `${attrType.label} (Inactivo)`
          : attrType.label;

        return (
          <div key={attrType.code}>
            <label
              className={`mb-1 block text-sm font-medium ${
                isInactive
                  ? "text-zinc-400 dark:text-zinc-500"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {label}
            </label>
            <MultiSelect
              value={currentValues}
              options={options}
              onChange={(e) => handleChange(attrType.code, (e.value as string[]) ?? [])}
              optionLabel="label"
              optionValue="value"
              placeholder={`Seleccione ${attrType.label.toLowerCase()}...`}
              display="chip"
              className="w-full"
              disabled={disabled || isInactive}
            />
            {orphanedValues.length > 0 && (
              <small className="mt-1 block text-amber-600 dark:text-amber-400">
                ⚠️ Valores no disponibles en el catálogo: {orphanedValues.join(", ")}
              </small>
            )}
          </div>
        );
      })}

      {/* Orphaned codes: attribute codes in the product that have no type in the catalog at all */}
      {orphanedCodes.map((code) => {
        const currentValues = value[code] ?? [];
        return (
          <div key={code}>
            <label className="mb-1 block text-sm font-medium text-zinc-400 dark:text-zinc-500">
              {code} (Tipo no encontrado)
            </label>
            <MultiSelect
              value={currentValues}
              options={currentValues.map((v) => ({ label: `${v} ⚠️`, value: v }))}
              onChange={(e) => handleChange(code, (e.value as string[]) ?? [])}
              optionLabel="label"
              optionValue="value"
              placeholder=""
              display="chip"
              className="w-full"
              disabled={true}
            />
            <small className="mt-1 block text-amber-600 dark:text-amber-400">
              ⚠️ Este tipo de atributo fue removido del catálogo
            </small>
          </div>
        );
      })}
    </div>
  );
}
