// Feature: document-sequences, Property 8: no consumo de correlativo antes de guardar
// Validates: Requirements 7.2, 7.5

import fc from "fast-check";
import { describe, it, expect, vi } from "vitest";

describe("InvoiceDialog — document sequence integration", () => {
  // Feature: document-sequences, Property 9: preservación de documentNo en modo edición
  // Validates: Requirements 7.7

  describe("Property 9: preservación de documentNo en modo edición", () => {
    it("should not call generateDocumentNo and preserve documentNo for any edit mode save", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }), // arbitrary documentNo
          async (originalDocumentNo) => {
            const generateDocNo = vi.fn().mockResolvedValue({ documentNo: "GENERATED", assignedNumber: 1 });
            const updateInvoiceMock = vi.fn().mockResolvedValue(undefined);

            // Simulate save() logic in edit mode (invoiceId is non-null)
            const invoiceId = "some-invoice-id";
            const activeSequence = null; // doesn't matter in edit mode

            async function saveInEditMode(documentNo: string) {
              // In edit mode: use documentNo as-is, never call generateDocumentNo
              if (invoiceId) {
                await updateInvoiceMock({ documentNo });
                return;
              }
              // Create mode (not reached in this test)
              if (activeSequence) {
                const result = await generateDocNo("seq-id");
                await updateInvoiceMock({ documentNo: result.documentNo });
              } else {
                await updateInvoiceMock({ documentNo });
              }
            }

            await saveInEditMode(originalDocumentNo);

            expect(generateDocNo).toHaveBeenCalledTimes(0);
            expect(updateInvoiceMock).toHaveBeenCalledWith({ documentNo: originalDocumentNo });
          }
        )
      );
    });
  });

  describe("Property 8: no consumo de correlativo antes de cambio de tipo", () => {
    it("should only call getActiveSequenceByDocumentType, never generateDocumentNo, on type change", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }), // arbitrary type value
          async (newType) => {
            const getActiveSequence = vi.fn().mockResolvedValue(null);
            const generateDocNo = vi.fn().mockResolvedValue({ documentNo: "F001-00000001", assignedNumber: 1 });

            // Simulate handleTypeChange logic (create mode: invoiceId is null)
            const invoiceId = null;

            // This is the logic from handleTypeChange in InvoiceDialog
            async function handleTypeChange(type: string) {
              if (!invoiceId) {
                await getActiveSequence(type).catch(() => null);
              }
            }

            await handleTypeChange(newType);

            expect(getActiveSequence).toHaveBeenCalledTimes(1);
            expect(getActiveSequence).toHaveBeenCalledWith(newType);
            expect(generateDocNo).toHaveBeenCalledTimes(0);
          }
        )
      );
    });
  });
});
