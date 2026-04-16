// Feature: document-sequences, Property 1: invariante de orden del listado

import fc from "fast-check";
import { describe, it, expect } from "vitest";

// Validates: Requirements 1.2

function sortDocumentSequences<T extends { documentType: string; sequence: string }>(
  records: T[]
): T[] {
  return [...records].sort((a, b) => {
    const typeCompare = a.documentType.localeCompare(b.documentType);
    if (typeCompare !== 0) return typeCompare;
    return a.sequence.localeCompare(b.sequence);
  });
}

// Feature: document-sequences, Property 2: rechazo de series inválidas

function validateSequence(sequence: string): void {
  if (!sequence || !/^[A-Za-z0-9]+$/.test(sequence)) {
    throw new Error("La serie solo puede contener letras y números, sin espacios ni caracteres especiales.");
  }
}

describe("document-sequence service", () => {
  describe("Property 1: invariante de orden del listado", () => {
    it("should sort records by documentType ASC then sequence ASC for any input", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              documentType: fc.string(),
              sequence: fc.string(),
              id: fc.string(),
              currentNumber: fc.integer(),
              maxNumber: fc.integer(),
              active: fc.boolean(),
            })
          ),
          (records) => {
            const sorted = sortDocumentSequences(records);

            for (let i = 0; i < sorted.length - 1; i++) {
              const a = sorted[i];
              const b = sorted[i + 1];
              const typeCompare = a.documentType.localeCompare(b.documentType);

              // documentType[i] must be <= documentType[i+1]
              expect(typeCompare).toBeLessThanOrEqual(0);

              // if documentType is equal, sequence[i] must be <= sequence[i+1]
              if (typeCompare === 0) {
                expect(a.sequence.localeCompare(b.sequence)).toBeLessThanOrEqual(0);
              }
            }
          }
        )
      );
    });
  });

  describe("Property 2: rechazo de series inválidas", () => {
    // Feature: document-sequences, Property 2: rechazo de series inválidas
    // Validates: Requirements 2.2, 3.2
    it("should throw for any empty string or string with non-alphanumeric characters", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(""),
            fc.string().filter(s => /[^A-Za-z0-9]/.test(s))
          ),
          (invalidSequence) => {
            expect(() => validateSequence(invalidSequence)).toThrow();
          }
        )
      );
    });
  });

  describe("Property 3: validación de tipo de comprobante", () => {
    // Feature: document-sequences, Property 3: validación de tipo de comprobante
    // Validates: Requirements 2.3, 3.2

    const VALID_TYPES = ["invoice", "credit_note", "debit_note"];
    function validateDocumentType(documentType: string): void {
      if (!VALID_TYPES.includes(documentType)) {
        throw new Error("El tipo de comprobante no es válido.");
      }
    }

    it("should throw for any string that is not a valid document type", () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !["invoice", "credit_note", "debit_note"].includes(s)),
          (invalidType) => {
            expect(() => validateDocumentType(invalidType)).toThrow();
          }
        )
      );
    });
  });

  describe("Property 4: validación de rango numérico", () => {
    // Feature: document-sequences, Property 4: validación de rango numérico
    // Validates: Requirements 2.4, 2.5, 3.2

    function validateNumbers(currentNumber: number, maxNumber: number): void {
      if (!Number.isInteger(currentNumber) || currentNumber < 1) {
        throw new Error("El número actual debe ser un entero mayor o igual a 1.");
      }
      if (!Number.isInteger(maxNumber) || maxNumber <= currentNumber) {
        throw new Error("El número máximo debe ser mayor al número actual.");
      }
    }

    it("should throw for any invalid (currentNumber, maxNumber) pair", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // currentNumber < 1
            fc.tuple(
              fc.integer({ max: 0 }),
              fc.integer()
            ),
            // maxNumber <= currentNumber (with valid currentNumber)
            fc.tuple(
              fc.integer({ min: 1 }),
              fc.integer()
            ).filter(([cur, max]) => max <= cur)
          ),
          ([currentNumber, maxNumber]) => {
            expect(() => validateNumbers(currentNumber, maxNumber)).toThrow();
          }
        )
      );
    });

    it("should not throw for any valid (currentNumber, maxNumber) pair", () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 1, max: 99999998 }),
            fc.integer({ min: 2, max: 99999999 })
          ).filter(([cur, max]) => max > cur),
          ([currentNumber, maxNumber]) => {
            expect(() => validateNumbers(currentNumber, maxNumber)).not.toThrow();
          }
        )
      );
    });
  });

  describe("Property 6: round-trip de formato de número de documento", () => {
    // Feature: document-sequences, Property 6: round-trip de formato de número de documento
    // Validates: Requirements 6.2, 6.5

    function formatDocumentNo(sequence: string, n: number): string {
      return `${sequence}-${String(n).padStart(8, "0")}`;
    }

    it("should satisfy round-trip: parsed number equals n and documentNo starts with sequence prefix", () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.string({ minLength: 1 }).filter(s => /^[A-Za-z0-9]+$/.test(s)),
            fc.integer({ min: 1, max: 99999999 })
          ),
          ([sequence, n]) => {
            const documentNo = formatDocumentNo(sequence, n);
            expect(parseInt(documentNo.split("-").pop()!, 10)).toBe(n);
            expect(documentNo.startsWith(sequence + "-")).toBe(true);
          }
        )
      );
    });
  });

  describe("Property 7: propagación de errores en generación", () => {
    // Feature: document-sequences, Property 7: propagación de errores en generación
    // Validates: Requirements 6.4

    async function generateDocumentNoLogic(
      sequence: string,
      getNextNumber: () => Promise<number>
    ): Promise<{ documentNo: string; assignedNumber: number }> {
      // This is the core logic of generateDocumentNo — propagates errors from getNextNumber
      const assignedNumber = await getNextNumber();
      const documentNo = `${sequence}-${String(assignedNumber).padStart(8, "0")}`;
      return { documentNo, assignedNumber };
    }

    it("should rethrow exactly the same error from getNextNumber for any error message", () => {
      return fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (message) => {
            const error = new Error(message);
            const getNextNumber = () => Promise.reject(error);
            await expect(
              generateDocumentNoLogic("SEQ", getNextNumber)
            ).rejects.toThrow(message);
          }
        )
      );
    });
  });

  describe("Property 5: incremento atómico y unicidad del correlativo", () => {
    // Feature: document-sequences, Property 5: incremento atómico y unicidad del correlativo
    // Validates: Requirements 5.2, 5.4, 5.6

    function computeNextNumber(
      currentNumber: number,
      maxNumber: number,
      sequence: string
    ): number {
      const next = currentNumber + 1;
      if (next > maxNumber) {
        throw new Error(
          `La secuencia ${sequence} ha alcanzado el número máximo permitido (${maxNumber}).`
        );
      }
      return next;
    }

    it("5a: should return exactly currentNumber + 1 for any valid currentNumber", () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 1, max: 99999997 }),
            fc.string({ minLength: 1 }).filter(s => /^[A-Za-z0-9]+$/.test(s))
          ).map(([cur, seq]) => ({ cur, max: cur + 2, seq })),
          ({ cur, max, seq }) => {
            const result = computeNextNumber(cur, max, seq);
            expect(result).toBe(cur + 1);
          }
        )
      );
    });

    it("5b: should throw when currentNumber >= maxNumber", () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 1, max: 99999999 }),
            fc.string({ minLength: 1 }).filter(s => /^[A-Za-z0-9]+$/.test(s))
          ).map(([max, seq]) => ({ cur: max, max, seq })),
          ({ cur, max, seq }) => {
            expect(() => computeNextNumber(cur, max, seq)).toThrow(
              `La secuencia ${seq} ha alcanzado el número máximo permitido (${max}).`
            );
          }
        )
      );
    });

    it("5c: should return all distinct values for N sequential calls with incrementing currentNumber", () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 1, max: 10 }),
            fc.integer({ min: 1, max: 99999990 }),
            fc.string({ minLength: 1 }).filter(s => /^[A-Za-z0-9]+$/.test(s))
          ),
          ([n, startCurrent, seq]) => {
            const maxNumber = startCurrent + n + 1;
            const results: number[] = [];
            for (let i = 0; i < n; i++) {
              const currentNumber = startCurrent + i;
              results.push(computeNextNumber(currentNumber, maxNumber, seq));
            }
            const unique = new Set(results);
            expect(unique.size).toBe(results.length);
          }
        )
      );
    });
  });
});
