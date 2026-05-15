import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpCodeInput } from "~/components/DpCodeInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getPurchaseOrderById,
  addPurchaseOrder,
  updatePurchaseOrder,
  type PurchaseOrderStatus,
} from "~/features/purchasing/purchase-orders";
import { getSuppliers, type SupplierRecord } from "~/features/purchasing/suppliers";
import { generateSequenceCode } from "~/features/system/sequences";
import { getActiveCompanyCurrencyOptions } from "~/features/system/companies";
import {
  PURCHASE_ORDER_STATUS,
  statusToSelectOptions,
} from "~/constants/status-options";
import { useLocationContext } from "~/lib/location-context";

export interface PurchaseOrderDialogProps {
  visible: boolean;
  orderId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const STATUS_OPTIONS = statusToSelectOptions(PURCHASE_ORDER_STATUS);

export default function PurchaseOrderDialog({
  visible,
  orderId,
  onSuccess,
  onHide,
}: PurchaseOrderDialogProps) {
  const isEdit = !!orderId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";
  const { activeLocationId, locations } = useLocationContext();

  const [code, setCode] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<PurchaseOrderStatus>("draft");

  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [currencyOptions, setCurrencyOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTouched(false);

    const loadData = async () => {
      setLoading(true);
      try {
        const { items: supplierList } = await getSuppliers();
        setSuppliers(supplierList);

        if (!orderId) {
          setCode("");
          setSupplierId("");
          setIssueDate(new Date().toISOString().slice(0, 10));
          setExpectedDeliveryDate("");
          setCurrency("PEN");
          setNotes("");
          setStatus("draft");
        } else {
          const data = await getPurchaseOrderById(orderId);
          if (!data) {
            setError("Orden de compra no encontrada.");
            return;
          }
          setCode(data.code ?? "");
          setSupplierId(data.supplierId ?? "");
          setIssueDate(data.issueDate ?? "");
          setExpectedDeliveryDate(data.expectedDeliveryDate ?? "");
          setCurrency(data.currency ?? "PEN");
          setNotes(data.notes ?? "");
          setStatus(data.status ?? "draft");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [visible, orderId]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getActiveCompanyCurrencyOptions()
      .then(({ options, defaultCurrency }) => {
        if (cancelled) return;
        const mapped = options.map((opt) => ({ label: opt.label, value: opt.value }));
        setCurrencyOptions(mapped);
        setCurrency((prev) => (mapped.some((x) => x.value === prev) ? prev : defaultCurrency));
      })
      .catch((err) => {
        if (cancelled) return;
        setCurrencyOptions([]);
        setError(err instanceof Error ? err.message : "No se pudo cargar la configuración de monedas.");
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.businessName,
  }));

  const supplierIdInvalid = touched && !supplierId;
  const issueDateInvalid = touched && !issueDate;

  const valid = !!supplierId && !!issueDate;

  const save = async () => {
    setTouched(true);
    if (!valid) return;

    setSaving(true);
    setError(null);
    try {
      const selectedSupplier = suppliers.find((s) => s.id === supplierId);
      const supplierName = selectedSupplier?.businessName ?? "";
      const locationName =
        locations.find((l) => l.id === activeLocationId)?.name ?? "";

      if (orderId) {
        await updatePurchaseOrder(orderId, {
          supplierId,
          supplierName,
          issueDate,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          currency,
          notes: notes.trim() || undefined,
          status,
          locationId: activeLocationId ?? "",
          locationName,
        });
      } else {
        let finalCode: string;
        try {
          finalCode = await generateSequenceCode(code, "purchase-order");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al generar código.");
          setSaving(false);
          return;
        }

        await addPurchaseOrder({
          code: finalCode,
          supplierId,
          supplierName,
          issueDate,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          currency,
          notes: notes.trim() || undefined,
          status: "draft",
          locationId: activeLocationId ?? "",
          locationName,
        });
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
      title={isEdit ? "Editar orden de compra" : "Agregar orden de compra"}
      recordId={isEdit ? orderId : null}
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
        <DpCodeInput
          entity="purchase-order"
          value={code}
          onChange={setCode}
          disabled={isEdit}
        />

        <DpInput
          type="select"
          label="Proveedor *"
          name="supplierId"
          value={supplierId}
          onChange={(v) => setSupplierId(String(v))}
          options={supplierOptions}
          placeholder="Seleccionar proveedor"
        />
        {supplierIdInvalid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            El proveedor es obligatorio.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DpInput
            type="date"
            label="Fecha de emisión *"
            name="issueDate"
            value={issueDate}
            onChange={setIssueDate}
          />
          <DpInput
            type="date"
            label="Fecha entrega esperada"
            name="expectedDeliveryDate"
            value={expectedDeliveryDate}
            onChange={setExpectedDeliveryDate}
          />
        </div>
        {issueDateInvalid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            La fecha de emisión es obligatoria.
          </p>
        )}

        <DpInput
          type="select"
          label="Moneda"
          name="currency"
          value={currency}
          onChange={(v) => setCurrency(String(v))}
          options={currencyOptions}
        />

        <DpInput
          type="textarea"
          label="Notas"
          name="notes"
          value={notes}
          onChange={setNotes}
          placeholder="Observaciones adicionales..."
        />

        {isEdit && (
          <DpInput
            type="select"
            label="Estado"
            name="status"
            value={status}
            onChange={(v) => setStatus(v as PurchaseOrderStatus)}
            options={STATUS_OPTIONS}
          />
        )}
      </div>
    </DpContentSet>
  );
}
