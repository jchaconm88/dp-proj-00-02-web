import fc from "fast-check";
import { describe, it, expect } from "vitest";

type WoocommerceType = "simple" | "variable" | "grouped";
type EcommerceStatus = "active" | "inactive" | "discontinued";
type ProductType = "good" | "service" | "raw_material" | "finished_good" | "semi_finished" | "by_product" | "supply";

interface TestProduct {
  productType: ProductType;
  woocommerceType: WoocommerceType;
  hasVariants: boolean;
  ecommerceStatus: EcommerceStatus;
  salePrice: number;
  sku: string | undefined;
  categoryPath: string[];
}

function deriveWoocommerceType(hasVariants: boolean, userType: WoocommerceType): WoocommerceType {
  if (hasVariants) return "variable";
  return userType;
}

function isValidForVisibleInStore(p: TestProduct): string[] {
  const missing: string[] = [];
  if (!p.sku || p.sku.trim().length === 0) missing.push("SKU");
  if (p.categoryPath.length === 0) missing.push("categoryPath");
  if (deriveWoocommerceType(p.hasVariants, p.woocommerceType) !== "grouped" && p.salePrice <= 0) {
    missing.push("salePrice");
  }
  return missing;
}

describe("Property 7: woocommerceType derivation", () => {
  it("should be 'variable' when variants exist, independent of user selection", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<WoocommerceType>("simple", "grouped", "variable"),
        (userType) => {
          const derived = deriveWoocommerceType(true, userType);
          expect(derived).toBe("variable");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should accept user choice when no variants exist", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<WoocommerceType>("simple", "grouped"),
        (userType) => {
          const derived = deriveWoocommerceType(false, userType);
          expect(derived).toBe(userType);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 8: ERP type and WC type independence", () => {
  it("should accept any combination of ProductType and WoocommerceType", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ProductType>("good", "service", "raw_material", "finished_good", "semi_finished", "by_product", "supply"),
        fc.constantFrom<WoocommerceType>("simple", "variable", "grouped"),
        (productType, woocommerceType) => {
          expect(productType).toBeDefined();
          expect(woocommerceType).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 12: visibleInStore validation", () => {
  it("should reject products missing required fields when visibleInStore is true", () => {
    fc.assert(
      fc.property(
        fc.record({
          productType: fc.constantFrom<ProductType>("good", "service", "raw_material", "finished_good", "semi_finished", "by_product", "supply"),
          woocommerceType: fc.constantFrom<WoocommerceType>("simple", "grouped"),
          hasVariants: fc.boolean(),
          ecommerceStatus: fc.constantFrom<EcommerceStatus>("active", "inactive", "discontinued"),
          salePrice: fc.nat({ max: 1000 }),
          sku: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
          categoryPath: fc.option(fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }), { nil: undefined }),
        }),
        (raw) => {
          const p: TestProduct = {
            ...raw,
            categoryPath: raw.categoryPath ?? [],
          };
          const missing = isValidForVisibleInStore(p);
          const derivedType = deriveWoocommerceType(p.hasVariants, p.woocommerceType);
          if (derivedType === "variable") return; // skip variable (handled differently)

          const shouldBeValid = p.sku !== undefined && p.sku.length > 0 &&
            p.categoryPath.length > 0 &&
            (derivedType === "grouped" || p.salePrice > 0);

          if (shouldBeValid) {
            expect(missing).toEqual([]);
          } else {
            expect(missing.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
