import { useState, useEffect } from "react";
import { DpInput } from "~/components/ui";
import { DpContentSet } from "~/components/ui";
import { webFetch } from "~/lib/backend-client";
import { requireActiveCompanyId } from "~/lib/tenant";
import { getWarehouses, type WarehouseRecord } from "~/features/inventory/warehouses";
import type { PurchaseOrderItemRecord } from "~/features/purchasing/purchase-orders";

export interface PurchaseOrderReceptionDialogProps {
  visible: boolean;
  orderId: string;
  items: PurchaseOrderItemRecord[];
  onSuccess?: () => void;
  onHide: () => void;
}

interface ReceptionLine {
  itemId: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  quantityToReceive: string;
}

export default function PurchaseOrderReceptionDialog({
  visible,
  orderId,
  items,
  onSuccess,
  onHide,
}: PurchaseOrderReceptionDialogProps) {
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [lines, setLines] = useState<ReceptionLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Load warehouses and build reception lines when dialog opens
  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTouched(false);
    setWarehouseId("");

    const loadData = async () => {
      setLoading(true);
      try {
        const { items: warehouseList } = await getWarehouses();
        setWarehouses(warehouseList.filter((w) => w.active));

        // Build reception lines from items
        const receptionLines: ReceptionLine[] = items
          .map((item) => {
            const ordered = item.quantity ?? 0;
            const received = item.receivedQuantity ?? 0;
            const pending = ordered - received;
            return {
              itemId: item.id,
              productName: item.productName,
              orderedQuantity: ordered,
              receivedQuantity: received,
              pendingQuantity: pending,
              quantityToReceive: pending > 0 ? String(pending) : "0",
            };
          })
          .filter((line) => line.pendingQuantity > 0);

        setLines(receptionLines);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar datos.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [visible, items]);

  const warehouseOptions = warehouses.map((w) => ({
    value: w.id,
    label: `${w.code ? w.code + " - " : ""}${w.name}`,
  }));

  const updateLineQuantity = (index: number, value: string) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantityToReceive: value };
      return updated;
    });
  };

  // Validation
  const warehouseInvalid = touched && !warehouseId;
  const linesWithQuantity = lines.filter((l) => {
    const qty = Number(l.quantityToReceive) || 0;
    return qty > 0;
  });
  const hasAtLeastOneItem = linesWithQuantity.length > 0;
  const allQuantitiesValid = lines.every((line) => {
    const qty = Number(line.quantityToReceive) || 0;
    return qty === 0 || (qty >= 1 && qty <= line.pendingQuantity);
  });
  const noItemsInvalid = touched && !hasAtLeastOneItem;

  const valid = !!warehouseId && hasAtLeastOneItem && allQuantitiesValid;

  const save = async () => {
    setTouched(true);
    if (!valid) return;

    setSaving(true);
    setError(null);
    try {
      const companyId = requireActiveCompanyId();
      const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);

      const receptionItems = lines
        .filter((l) => {
          const qty = Number(l.quantityToReceive) || 0;
          return qty >= 1;
        })
        .map((l) => ({
          itemId: l.itemId,
          receivedQuantity: Number(l.quantityToReceive),
        }));

      await webFetch(`/purchasing/purchase-orders/${encodeURIComponent(orderId)}/receive`, {
        method: "POST",
        body: JSON.stringify({
          companyId,
          warehouseId,
          warehouseName: selectedWarehouse?.name ?? "",
          items: receptionItems,
        }),
      });

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar recepción.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DpContentSet
      title="Recibir mercadería"
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Confirmar recepción"
      onSave={save}
      saving={saving}
      saveDisabled={!valid}
      visible={visible}
      onHide={onHide}
      dialogWidth="min(56rem, 96vw)"
      showLoading={loading}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        <DpInput
          type="select"
          label="Almacén destino *"
          name="warehouseId"
          value={warehouseId}
          onChange={(v) => setWarehouseId(String(v))}
          options={warehouseOptions}
          placeholder="Seleccionar almacén de destino"
        />
        {warehouseInvalid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            El almacén destino es obligatorio.
          </p>
        )}

        {lines.length === 0 && !loading && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Todos los ítems ya han sido recibidos completamente.
          </div>
        )}

        {lines.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--dp-on-surface)]">
              Ítems a recibir
            </p>
            <div className="divide-y divide-white/10 rounded-lg border border-white/10">
              {lines.map((line, index) => {
                const qty = Number(line.quantityToReceive) || 0;
                const isInvalid =
                  touched && qty > 0 && (qty < 1 || qty > line.pendingQuantity);
                return (
                  <div
                    key={line.itemId}
                    className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--dp-on-surface)] truncate">
                        {line.productName}
                      </p>
                      <p className="text-xs text-[var(--dp-on-surface-soft)]">
                        Pedido: {line.orderedQuantity} | Recibido: {line.receivedQuantity} |{" "}
                        <span className="font-semibold">Pendiente: {line.pendingQuantity}</span>
                      </p>
                    </div>
                    <div className="w-full md:w-36">
                      <DpInput
                        type="number"
                        label="Cantidad"
                        name={`qty-${line.itemId}`}
                        value={line.quantityToReceive}
                        onChange={(v) => updateLineQuantity(index, String(v))}
                        placeholder="0"
                      />
                      {isInvalid && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          Debe ser entre 1 y {line.pendingQuantity}.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {noItemsInvalid && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Debe ingresar cantidad a recibir en al menos un ítem.
          </p>
        )}
      </div>
    </DpContentSet>
  );
}
