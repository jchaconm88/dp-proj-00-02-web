import { useState, useEffect, useMemo } from "react";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  dispatchSaleOrder,
  type SaleOrderItemRecord,
  type SaleOrderRecord,
} from "~/features/sales/sale-orders";
import { getWarehouses, type WarehouseRecord } from "~/features/inventory/warehouses";
import { requireActiveCompanyId } from "~/lib/tenant";

export interface SaleOrderDispatchDialogProps {
  visible: boolean;
  order: SaleOrderRecord;
  items: SaleOrderItemRecord[];
  onSuccess?: () => void;
  onHide: () => void;
}

interface DispatchLine {
  itemId: string;
  productName: string;
  orderedQuantity: number;
  dispatchedQuantity: number;
  pendingQuantity: number;
  quantityToDispatch: string;
}

export default function SaleOrderDispatchDialog({
  visible,
  order,
  items,
  onSuccess,
  onHide,
}: SaleOrderDispatchDialogProps) {
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");

  const [lines, setLines] = useState<DispatchLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Initialize dispatch lines from items
  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTouched(false);
    setWarehouseId("");

    const dispatchLines: DispatchLine[] = items.map((item) => {
      const dispatched = item.dispatchedQuantity ?? 0;
      const pending = item.quantity - dispatched;
      return {
        itemId: item.id,
        productName: item.productName,
        orderedQuantity: item.quantity,
        dispatchedQuantity: dispatched,
        pendingQuantity: pending,
        quantityToDispatch: pending > 0 ? String(pending) : "0",
      };
    });
    setLines(dispatchLines);
  }, [visible, items]);

  // Load warehouses
  useEffect(() => {
    if (!visible) return;
    setLoadingWarehouses(true);
    getWarehouses()
      .then(({ items: wh }) => setWarehouses(wh.filter((w) => w.active)))
      .catch(() => setWarehouses([]))
      .finally(() => setLoadingWarehouses(false));
  }, [visible]);

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((w) => ({
        value: w.id,
        label: `${w.code ? w.code + " - " : ""}${w.name}`,
      })),
    [warehouses]
  );

  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);

  const updateLineQuantity = (index: number, value: string) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantityToDispatch: value };
      return updated;
    });
  };

  // Validation
  const hasAtLeastOneItem = lines.some((l) => {
    const qty = Number(l.quantityToDispatch) || 0;
    return qty > 0;
  });

  const allQuantitiesValid = lines.every((l) => {
    const qty = Number(l.quantityToDispatch) || 0;
    if (qty === 0) return true; // skip items with 0
    return qty >= 1 && qty <= l.pendingQuantity;
  });

  const warehouseValid = !!warehouseId;
  const formValid = warehouseValid && hasAtLeastOneItem && allQuantitiesValid;

  const save = async () => {
    setTouched(true);
    if (!formValid) return;

    setSaving(true);
    setError(null);

    try {
      const companyId = requireActiveCompanyId();
      const dispatchItems = lines
        .filter((l) => (Number(l.quantityToDispatch) || 0) > 0)
        .map((l) => ({
          itemId: l.itemId,
          dispatchedQuantity: Number(l.quantityToDispatch),
        }));

      await dispatchSaleOrder(order.id, {
        companyId,
        warehouseId,
        warehouseName: selectedWarehouse?.name ?? "",
        items: dispatchItems,
      });

      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al despachar.";
      // Check for insufficient_stock error
      if (message.includes("insufficient_stock")) {
        setError(`Stock insuficiente. Verifique la disponibilidad en el almacén seleccionado.`);
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const hasPendingItems = lines.some((l) => l.pendingQuantity > 0);

  return (
    <DpContentSet
      title="Despachar mercadería"
      recordId={null}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Despachar"
      onSave={save}
      saving={saving}
      saveDisabled={!formValid || saving}
      visible={visible}
      onHide={onHide}
      showLoading={loadingWarehouses}
      showError={!!error}
      errorMessage={error ?? ""}
    >
      <div className="flex flex-col gap-4 pt-2">
        {!hasPendingItems && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">
            Todos los ítems ya han sido despachados completamente.
          </div>
        )}

        <DpInput
          type="select"
          label="Almacén origen *"
          name="warehouseId"
          value={warehouseId}
          onChange={(v) => setWarehouseId(String(v))}
          options={warehouseOptions}
          placeholder="Seleccionar almacén"
        />
        {touched && !warehouseValid && (
          <p className="mt-[-0.5rem] text-xs text-red-600 dark:text-red-400">
            Debe seleccionar un almacén de origen.
          </p>
        )}

        {/* Items table */}
        <div className="mt-2">
          <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Ítems a despachar
          </h4>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                    Producto
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                    Ordenado
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                    Despachado
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                    Pendiente
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">
                    Cantidad a despachar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {lines.map((line, index) => {
                  const qty = Number(line.quantityToDispatch) || 0;
                  const isInvalid =
                    touched &&
                    qty > 0 &&
                    (qty < 1 || qty > line.pendingQuantity);
                  const isDisabled = line.pendingQuantity <= 0;

                  return (
                    <tr
                      key={line.itemId}
                      className={
                        isDisabled
                          ? "bg-gray-50 opacity-60 dark:bg-gray-800/50"
                          : ""
                      }
                    >
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                        {line.productName}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                        {line.orderedQuantity}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                        {line.dispatchedQuantity}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                        {line.pendingQuantity}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={line.pendingQuantity}
                          value={line.quantityToDispatch}
                          onChange={(e) =>
                            updateLineQuantity(index, e.target.value)
                          }
                          disabled={isDisabled}
                          className={`w-24 rounded border px-2 py-1 text-right text-sm ${
                            isInvalid
                              ? "border-red-500 bg-red-50 dark:border-red-400 dark:bg-red-900/20"
                              : "border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        />
                        {isInvalid && (
                          <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                            Debe ser entre 1 y {line.pendingQuantity}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {touched && !hasAtLeastOneItem && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Debe despachar al menos un ítem con cantidad mayor a 0.
          </p>
        )}
      </div>
    </DpContentSet>
  );
}
