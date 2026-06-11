import fc from "fast-check";
import { describe, it, expect } from "vitest";
import {
  buildCategoryTree,
  getCategoryDepth,
  computeCategoryPath,
  computePrimaryCategoryPath,
} from "../product-categories.service";
import type { ProductCategoryRecord } from "../product-categories.types";

function makeCategory(overrides: Partial<ProductCategoryRecord>): ProductCategoryRecord {
  return {
    id: overrides.id ?? "",
    code: overrides.code ?? "",
    name: overrides.name ?? "",
    parentCategoryId: overrides.parentCategoryId,
    active: overrides.active ?? true,
    companyId: "c1",
    accountId: "a1",
  };
}

describe("Property 1: Category depth invariant", () => {
  it("should never produce a tree with depth > 3 for valid input", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            parentCategoryId: fc.option(fc.uuid(), { nil: undefined }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (rawCategories) => {
          const categories = rawCategories.map((r, i) =>
            makeCategory({
              id: r.id,
              parentCategoryId: r.parentCategoryId,
              code: `C${i}`,
              name: `Category ${i}`,
            })
          );
          const tree = buildCategoryTree(categories);
          const maxDepth = (() => {
            const flatten = (nodes: import("../product-categories.types").CategoryTreeNode[], depth: number): number =>
              nodes.reduce((max, n) => Math.max(max, flatten(n.children, depth + 1)), depth);
            return flatten(tree, 0);
          })();
          expect(maxDepth).toBeLessThanOrEqual(3);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("computePrimaryCategoryPath", () => {
  it("returns the deepest path when multiple ancestors are selected", () => {
    const tree = buildCategoryTree([
      makeCategory({ id: "1", name: "Calzado", code: "C1" }),
      makeCategory({ id: "2", name: "Zapatillas", code: "C2", parentCategoryId: "1" }),
      makeCategory({ id: "3", name: "Hombre", code: "C3", parentCategoryId: "2" }),
    ]);
    expect(computePrimaryCategoryPath(tree, ["1", "2", "3"])).toEqual([
      "Calzado",
      "Zapatillas",
      "Hombre",
    ]);
    expect(computePrimaryCategoryPath(tree, ["1"])).toEqual(["Calzado"]);
  });
});

describe("Property 4: categoryPath derivation from tree traversal", () => {
  it("should produce correct root-to-leaf path for any category", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            parentCategoryId: fc.option(fc.uuid(), { nil: undefined }),
            name: fc.string({ minLength: 1, maxLength: 10 }),
          }),
          { minLength: 1, maxLength: 15 }
        ),
        (rawCategories) => {
          const categories = rawCategories.map((r, i) =>
            makeCategory({
              id: r.id,
              parentCategoryId: r.parentCategoryId,
              code: `C${i}`,
              name: r.name,
            })
          );
          // Ensure the tree is valid (no cycles) by only testing if the tree was built
          const tree = buildCategoryTree(categories);
          if (tree.length === 0) return;

          // Pick a leaf from the tree
          const flatten = (nodes: import("../product-categories.types").CategoryTreeNode[]): import("../product-categories.types").CategoryTreeNode[] =>
            nodes.flatMap((n) => [n, ...flatten(n.children)]);
          const allNodes = flatten(tree);
          if (allNodes.length === 0) return;

          const target = allNodes[Math.floor(Math.random() * allNodes.length)];
          const path = computeCategoryPath(tree, target.id);

          expect(path.length).toBeGreaterThan(0);
          expect(path[path.length - 1]).toBe(target.name);
        }
      ),
      { numRuns: 100 }
    );
  });
});
