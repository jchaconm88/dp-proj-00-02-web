import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getInvoiceCredits,
  addInvoiceCredit,
  updateInvoiceCredit,
} from "~/features/billing/invoice";
import { formatAmountWithSymbol } from "~/constants/currency-format";

export interface InvoiceCreditDialogProps {
  visible: boolean;
  invoiceId: string;
  creditId: string | null;
  /** Total de la factura para validar que la suma de cuotas no lo supere. */
  invoiceTotalAmount: number;
  /** Moneda de la factura. */
  currency: string;
  /** Si true, la cuota no es editable (factura no está en borrador). */
  locked?: boolean;
  onSuccess?: () => void;
  onHide: () => void;
}

export default function InvoiceCreditDialog({
  visible,
  invoiceId,
  creditId,
  invoiceTotalAmount,
  currency,
  locked = false,
  onSuccess,
  onHide,
}: InvoiceCreditDialogProps) {
  const isEdit = !!creditId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [correlative, setCorrelative] = useState("1");
  const [dueDate, setDueDate] = useState("");
  const [creditVal, setCreditVal] = useState("0");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);

    if (!creditId) {
      setCorrelative("1");
      setDueDate("");
      setCreditVal("0");
      setLoading(false);
      return;
    }

    setLoading(true);
    getInvoiceCredits(invoiceId)
      .then(({ items }) => {
        const found = items.find((c) => c.id === creditId);
        if (!found) {
          setError("Cuota no encontrada.");
          return;
        }
        setCorrelative(String(found.correlative));
        setDueDate(found.dueDate);
        setCreditVal(String(found.creditVal));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, invoiceId, creditId]);

  const corrNum = Number(correlative);
  const creditNum = Number(creditVal);

  const valid =
    Number.isInteger(corrNum) && corrNum > 0 &&
    dueDate.trim() !== "" &&
    creditNum > 0;

  const save = async () => {
    if (!valid) return;
    if (locked) {
      setError("Solo se pueden editar cuotas cuando la factura está en estado Borrador.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = { correlative: corrNum, dueDate, creditVal: creditNum };
      if (creditId) {
        await updateInvoiceCredit(invoiceId, creditId, data);
      } else {
        await addInvoiceCredit(invoiceId, data);
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title={isEdit ? "Editar cuota" : "Agregar cuota"}
      recordId={isEdit ? creditId : null}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating || locked}
      visible={visible}
      onHide={onHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
      dialogBodyHeader={
        locked ? (
          <div className="pb-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              Esta factura no está en <strong>Borrador</strong> y no se pueden editar sus cuotas.
            </div>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpInput
          type="number"
          label="Nº Cuota"
          name="correlative"
          value={correlative}
          onChange={setCorrelative}
          placeholder="1"
          disabled={locked}
        />
        <DpInput
          type="date"
          label="Fecha de vencimiento"
          name="dueDate"
          value={dueDate}
          onChange={setDueDate}
          disabled={locked}
        />
        <DpInput
          type="number"
          label="Monto de la cuota"
          name="creditVal"
          value={creditVal}
          onChange={setCreditVal}
          placeholder="0"
          disabled={locked}
        />
        {Number(creditVal) > invoiceTotalAmount && (
          <p className="text-sm text-yellow-600">
            El monto de la cuota supera el total de la factura ({formatAmountWithSymbol(invoiceTotalAmount, currency)}).
          </p>
        )}
      </div>
    </DpContentSet>
  );
}
