import { describe, it, expect } from "vitest";
import type { ProductAttributeTypeRecord } from "~/features/inventory/product-attribute-types";

/**
 * Tests for FilterableAttributesSection logic.
 * Since the test environment is node (no DOM), we extract and test the
 * core logic: row computation, ordering, orphan detection, and option building.
 */

// --- Extracted logic functions (mirror component internals) ---

function computeRows(
  attributeTypes: ProductAttributeTypeRecord[],
  value: Record<string, string[]>
): ProductAttributeTypeRecord[] {
  const activeTypes = attributeTypes
    .filter((t) => t.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const inactiveAssigned = attributeTypes
    .filter((t) => !t.active && value[t.code] && value[t.code].length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return [...activeTypes, ...inactiveAssigned];
}

function computeOrphanedCodes(
  value: Record<string, string[]>,
  attributeTypes: ProductAttributeTypeRecord[]
): string[] {
  const typesByCode = new Map<string, ProductAttributeTypeRecord>();
  for (const t of attributeTypes) {
    typesByCode.set(t.code, t);
  }
  const codes: string[] = [];
  for (const code of Object.keys(value)) {
    if (!typesByCode.has(code) && value[code].length > 0) {
      codes.push(code);
    }
  }
  return codes;
}

function computeOrphanedValues(
  currentValues: string[],
  catalogValues: string[]
): string[] {
  return currentValues.filter((v) => !catalogValues.includes(v));
}

// --- Test data helpers ---

function makeType(overrides: Partial<ProductAttributeTypeRecord> & { code: string }): ProductAttributeTypeRecord {
  return {
    id: overrides.id ?? overrides.code,
    code: overrides.code,
    label: overrides.label ?? overrides.code.charAt(0).toUpperCase() + overrides.code.slice(1),
    values: overrides.values ?? [],
    sortOrder: overrides.sortOrder ?? 0,
    active: overrides.active ?? true,
    companyId: "company1",
    accountId: "account1",
    useForVariants: overrides.useForVariants ?? false,
    useForFilters: overrides.useForFilters ?? true,
    isColor: overrides.isColor ?? false,
    valueColors: overrides.valueColors ?? {},
  };
}

// --- Tests ---

describe("FilterableAttributesSection - Row computation", () => {
  it("shows active types ordered by sortOrder", () => {
    const types = [
      makeType({ code: "material", sortOrder: 3 }),
      makeType({ code: "marca", sortOrder: 1 }),
      makeType({ code: "genero", sortOrder: 2 }),
    ];
    const rows = computeRows(types, {});
    expect(rows.map((r) => r.code)).toEqual(["marca", "genero", "material"]);
  });

  it("shows inactive types only if they have assigned values", () => {
    const types = [
      makeType({ code: "marca", sortOrder: 1, active: true }),
      makeType({ code: "estilo", sortOrder: 2, active: false }),
      makeType({ code: "material", sortOrder: 3, active: false }),
    ];
    const value = { estilo: ["Casual"] };
    const rows = computeRows(types, value);
    expect(rows.map((r) => r.code)).toEqual(["marca", "estilo"]);
  });

  it("does not show inactive types without assigned values", () => {
    const types = [
      makeType({ code: "marca", sortOrder: 1, active: true }),
      makeType({ code: "estilo", sortOrder: 2, active: false }),
    ];
    const rows = computeRows(types, {});
    expect(rows.map((r) => r.code)).toEqual(["marca"]);
  });

  it("places inactive assigned types after all active types", () => {
    const types = [
      makeType({ code: "material", sortOrder: 5, active: true }),
      makeType({ code: "estilo", sortOrder: 1, active: false }),
      makeType({ code: "marca", sortOrder: 2, active: true }),
    ];
    const value = { estilo: ["Deportivo"] };
    const rows = computeRows(types, value);
    // Active first (sorted): marca(2), material(5), then inactive assigned: estilo(1)
    expect(rows.map((r) => r.code)).toEqual(["marca", "material", "estilo"]);
  });

  it("returns empty array when no types exist", () => {
    const rows = computeRows([], {});
    expect(rows).toEqual([]);
  });
});

describe("FilterableAttributesSection - Orphaned codes detection", () => {
  it("detects codes in value that have no matching type", () => {
    const types = [makeType({ code: "marca" })];
    const value = { marca: ["Nike"], removed_attr: ["SomeValue"] };
    const orphaned = computeOrphanedCodes(value, types);
    expect(orphaned).toEqual(["removed_attr"]);
  });

  it("ignores codes with empty arrays", () => {
    const types = [makeType({ code: "marca" })];
    const value = { marca: ["Nike"], removed_attr: [] };
    const orphaned = computeOrphanedCodes(value, types);
    expect(orphaned).toEqual([]);
  });

  it("returns empty when all codes have matching types", () => {
    const types = [makeType({ code: "marca" }), makeType({ code: "genero" })];
    const value = { marca: ["Nike"], genero: ["Hombre"] };
    const orphaned = computeOrphanedCodes(value, types);
    expect(orphaned).toEqual([]);
  });
});

describe("FilterableAttributesSection - Orphaned values detection", () => {
  it("detects values not in the catalog values array", () => {
    const currentValues = ["Nike", "Adidas", "Puma"];
    const catalogValues = ["Nike", "Adidas"];
    const orphaned = computeOrphanedValues(currentValues, catalogValues);
    expect(orphaned).toEqual(["Puma"]);
  });

  it("returns empty when all values are in catalog", () => {
    const currentValues = ["Nike", "Adidas"];
    const catalogValues = ["Nike", "Adidas", "Puma"];
    const orphaned = computeOrphanedValues(currentValues, catalogValues);
    expect(orphaned).toEqual([]);
  });

  it("returns all values when catalog is empty", () => {
    const currentValues = ["Nike", "Adidas"];
    const catalogValues: string[] = [];
    const orphaned = computeOrphanedValues(currentValues, catalogValues);
    expect(orphaned).toEqual(["Nike", "Adidas"]);
  });
});
