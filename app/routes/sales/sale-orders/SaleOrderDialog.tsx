import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/ui";
import { DpCodeInput } from "~/components/ui";
import { DpContentSet } from "~/components/ui";
import {
  getSaleOrderById,
  addSaleOrder,
  updateSaleOrder,
  type SaleOrderStatus,
} from "~/features/sales/sale-orders";
import { generateSequenceCode } from "~/features/system/sequences";
import { getActiveCompanyCurrencyOptions } from "~/features/system/companies";
import {
  SALE_ORDER_STATUS,
  statusToSelectOptions,
} from "~/constants/status-options";
import { useLocationContext } from "~/lib/location-context";

export interface SaleOrderDialogProps {
  visible: boolean;
  orderId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const STATUS_OPTIONS = statusToSelectOptions(SALE_ORDER_STATUS);

export default function SaleOrderDialog({
  visible,
  orderId,
  onSuccess,
  onHide,
}: SaleOrderDialogProps) {
  const isEdit = !!orderId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";
  const { activeLocationId, locations } = useLocationContext();

  const [code, setCode] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [currency, setCurrency] = useState("PEN");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<SaleOrderStatus>("draft");

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
        if (!orderId) {
          setCode("");
          setClientId("");
          setClientName("");
          setIssueDate(new Date().toISOString().slice(0, 10));
          setExpectedDeliveryDate("");
          setCurrency("PEN");
          setNotes("");
          setStatus("draft");
        } else {
          const data = await getSaleOrderById(orderId);
          if (!data) {
            setError("Orden de venta no encontrada.");
            return;
          }
          setCode(data.code ?? "");
          setClientId(data.clientId ?? "");
          setClientName(data.clientName ?? "");
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

  const clientIdInvalid = touched && !clientId.trim();
  const issueDateInvalid = touched && !issueDate;
  const currencyInvalid = touched && !currency.trim();

  const valid = !!clientId.trim() && !!issueDate && !!currency.trim();

  const save = async () => {
    setTouched(true);
    if (!valid) return;

    setSaving(true);
    setError(null);
    try {
      const locationName =
        locations.find((l) => l.id === activeLocationId)?.name ?? "";

      if (orderId) {
        await updateSaleOrder(orderId, {
          clientId: clientId.trim(),
          clientName: clientName.trim(),
          issueDate,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          currency: currency.trim(),
          notes: notes.trim() || undefined,
          status,
          locationId: activeLocationId ?? "",
          locationName,
        });
      } else {
        let finalCode: string;
        try {
          finalCode = await generateSequenceCode(code, "sale-order");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al generar código.");
          setSaving(false);
          return;
        }

        await addSaleOrder({
          code: finalCode,
          clientId: clientId.trim(),
          clientName: clientName.trim(),
          issueDate,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          currency: currency.trim(),
          subtotal: 0,
          taxAmount: 0,
          total: 0,
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
      title={isEdit ? "Editar orden de venta" : "Agregar orden de venta"}
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
          entity="sale-order"
          value={code}
          onChange={setCode}
          disabled={isEdit}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <DpInput
              type="input"
              label="ID Cliente *"
              name="clientId"
              value={clientId}
              onChange={setClientId}
              placeholder="ID del cliente"
            />
            {clientIdInvalid && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                El ID del cliente es obligatorio.
              </p>
            )}
          </div>
          <DpInput
            type="input"
            label="Nombre del cliente"
            name="clientName"
            value={clientName}
            onChange={setClientName}
            placeholder="Nombre o razón social del cliente"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <DpInput
              type="date"
              label="Fecha de emisión *"
              name="issueDate"
              value={issueDate}
              onChange={setIssueDate}
            />
            {issueDateInvalid && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                La fecha de emisión es obligatoria.
              </p>
            )}
          </div>
          <DpInput
            type="date"
            label="Fecha entrega esperada"
            name="expectedDeliveryDate"
            value={expectedDeliveryDate}
            onChange={setExpectedDeliveryDate}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <DpInput
              type="select"
              label="Moneda *"
              name="currency"
              value={currency}
              onChange={(v) => setCurrency(String(v))}
              options={currencyOptions}
            />
            {currencyInvalid && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                La moneda es obligatoria.
              </p>
            )}
          </div>
          {isEdit && (
            <DpInput
              type="select"
              label="Estado"
              name="status"
              value={status}
              onChange={(v) => setStatus(v as SaleOrderStatus)}
              options={STATUS_OPTIONS}
            />
          )}
        </div>

        <DpInput
          type="textarea"
          label="Notas"
          name="notes"
          value={notes}
          onChange={setNotes}
          placeholder="Observaciones adicionales..."
        />
      </div>
    </DpContentSet>
  );
}
