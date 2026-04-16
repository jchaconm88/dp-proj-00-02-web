import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getInvoiceItemById,
  addInvoiceItem,
  updateInvoiceItem,
} from "~/features/billing/invoice";
import {
  INVOICE_ITEM_TYPE,
  statusDefaultKey,
  statusToSelectOptions,
} from "~/constants/status-options";
import { formatAmountWithSymbol } from "~/constants/currency-format";
import type { InvoiceItemType } from "~/features/billing/invoice";

export interface InvoiceItemDialogProps {
  visible: boolean;
  invoiceId: string;
  itemId: string | null;
  /** Moneda de la factura padre (para persistir en el ítem). */
  currency: string;
  onSuccess?: () => void;
  onHide: () => void;
}

const ITEM_TYPE_OPTIONS = statusToSelectOptions(INVOICE_ITEM_TYPE);

export default function InvoiceItemDialog({
  visible,
  invoiceId,
  itemId,
  currency,
  onSuccess,
  onHide,
}: InvoiceItemDialogProps) {
  const isEdit = !!itemId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState<InvoiceItemType>(
    statusDefaultKey(INVOICE_ITEM_TYPE)
  );
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [taxTypeName, setTaxTypeName] = useState("IGV 18%");
  const [taxPer, setTaxPer] = useState("18");

  // Campos calculados (solo lectura)
  const [price, setPrice] = useState(0);
  const [tax, setTax] = useState(0);
  const [amount, setAmount] = useState(0);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recalcular en tiempo real
  useEffect(() => {
    const q = Number(quantity) || 0;
    const u = Number(unitPrice) || 0;
    const tp = Number(taxPer) || 0;
    const p = q * u;
    const t = p * tp / 100;
    const a = p + t;
    setPrice(p);
    setTax(t);
    setAmount(a);
  }, [quantity, unitPrice, taxPer]);

  // Cargar datos al abrir
  useEffect(() => {
    if (!visible) return;
    setError(null);

    if (!itemId) {
      setDescription("");
      setItemType(statusDefaultKey(INVOICE_ITEM_TYPE));
      setQuantity("1");
      setUnitPrice("0");
      setTaxTypeName("IGV 18%");
      setTaxPer("18");
      setLoading(false);
      return;
    }

    setLoading(true);
    getInvoiceItemById(invoiceId, itemId)
      .then((data) => {
        if (!data) {
          setError("Ítem no encontrado.");
          return;
        }
        setDescription(data.description ?? "");
        setItemType(data.itemType ?? statusDefaultKey(INVOICE_ITEM_TYPE));
        setQuantity(String(data.quantity ?? 1));
        setUnitPrice(String(data.unitPrice ?? 0));
        setTaxTypeName(data.taxType?.name ?? "IGV 18%");
        setTaxPer(String(data.taxType?.taxPer ?? 18));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, invoiceId, itemId]);

  const qNum = Number(quantity) || 0;
  const uNum = Number(unitPrice) || 0;

  const valid =
    description.trim() !== "" &&
    qNum > 0 &&
    uNum >= 0;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const tpNum = Number(taxPer) || 0;
      const data = {
        itemId: "",
        itemName: description,
        description,
        itemType,
        measure: { id: "", name: "UND", code: "NIU" },
        taxType: { id: "", name: taxTypeName, refCode: "1000", taxPer: tpNum },
        quantity: qNum,
        unitPrice: uNum,
        price,
        tax,
        amount,
        currency,
      };

      if (itemId) {
        await updateInvoiceItem(invoiceId, itemId, data);
      } else {
        await addInvoiceItem(invoiceId, data);
      }
      onSuccess?.();
      if (!onSuccess) {
        onHide();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title={isEdit ? "Editar ítem" : "Agregar ítem"}
      recordId={isEdit ? itemId : null}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={onHide}
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpInput
          type="input"
          label="Descripción"
          name="description"
          value={description}
          onChange={setDescription}
        />
        <DpInput
          type="select"
          label="Tipo de ítem"
          name="itemType"
          value={itemType}
          onChange={(v) => setItemType(v as InvoiceItemType)}
          options={ITEM_TYPE_OPTIONS}
        />
        <DpInput
          type="number"
          label="Cantidad"
          name="quantity"
          value={quantity}
          onChange={setQuantity}
          placeholder="1"
        />
        <DpInput
          type="number"
          label="Precio unitario"
          name="unitPrice"
          value={unitPrice}
          onChange={setUnitPrice}
          placeholder="0"
        />
        <DpInput
          type="input"
          label="Subtotal sin IGV"
          name="price"
          value={formatAmountWithSymbol(price, currency)}
          onChange={() => {}}
          disabled
        />
        <DpInput
          type="input"
          label="IGV"
          name="tax"
          value={formatAmountWithSymbol(tax, currency)}
          onChange={() => {}}
          disabled
        />
        <DpInput
          type="input"
          label="Total"
          name="amount"
          value={formatAmountWithSymbol(amount, currency)}
          onChange={() => {}}
          disabled
        />
        <DpInput
          type="input"
          label="Tipo impuesto"
          name="taxTypeName"
          value={taxTypeName}
          onChange={setTaxTypeName}
          placeholder="IGV 18%"
        />
        <DpInput
          type="number"
          label="% Impuesto"
          name="taxPer"
          value={taxPer}
          onChange={setTaxPer}
          placeholder="18"
        />
      </div>
    </DpContentSet>
  );
}
