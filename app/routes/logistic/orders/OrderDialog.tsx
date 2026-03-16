import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getOrderById,
  addOrder,
  updateOrder,
  type OrderStatus,
} from "~/features/logistic/orders";
import { getClients } from "~/features/master/clients";
import { ORDER_STATUS, statusToSelectOptions } from "~/constants/status-options";

export interface OrderDialogProps {
  visible: boolean;
  orderId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const STATUS_OPTIONS = statusToSelectOptions(ORDER_STATUS);

export default function OrderDialog({
  visible,
  orderId,
  onSuccess,
  onHide,
}: OrderDialogProps) {
  const isEdit = !!orderId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [clientOptions, setClientOptions] = useState<{ label: string; value: string }[]>([]);
  const [code, setCode] = useState("");
  const [clientId, setClientId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [deliveryWindowStart, setDeliveryWindowStart] = useState("08:00");
  const [deliveryWindowEnd, setDeliveryWindowEnd] = useState("12:00");
  const [weight, setWeight] = useState("");
  const [volume, setVolume] = useState("");
  const [status, setStatus] = useState<OrderStatus>("pending");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    getClients()
      .then(({ items }) => {
        setClientOptions(
          items.map((c) => ({
            label:
              (c.commercialName?.trim() || c.businessName?.trim()) || c.code || c.id,
            value: c.id,
          }))
        );
      })
      .catch(() => setClientOptions([]));

    if (!orderId) {
      setCode("");
      setClientId("");
      setDeliveryAddress("");
      setLatitude("");
      setLongitude("");
      setDeliveryWindowStart("08:00");
      setDeliveryWindowEnd("12:00");
      setWeight("");
      setVolume("");
      setStatus("pending");
      setLoading(false);
      return;
    }

    setLoading(true);
    getOrderById(orderId)
      .then((data) => {
        if (!data) {
          setError("Pedido no encontrado.");
          return;
        }
        setCode(data.code ?? "");
        setClientId(data.clientId ?? "");
        setDeliveryAddress(data.deliveryAddress ?? "");
        setLatitude(String(data.location?.latitude ?? ""));
        setLongitude(String(data.location?.longitude ?? ""));
        setDeliveryWindowStart(data.deliveryWindowStart ?? "08:00");
        setDeliveryWindowEnd(data.deliveryWindowEnd ?? "12:00");
        setWeight(String(data.weight ?? ""));
        setVolume(String(data.volume ?? ""));
        setStatus(data.status ?? "pending");
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar.")
      )
      .finally(() => setLoading(false));
  }, [visible, orderId]);

  const save = async () => {
    const selected = clientOptions.find((c) => c.value === clientId);
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: code.trim(),
        clientId: selected.value,
        client: selected.label,
        deliveryAddress: deliveryAddress.trim(),
        location: {
          latitude: Number(latitude) || 0,
          longitude: Number(longitude) || 0,
        },
        deliveryWindowStart: deliveryWindowStart.trim() || "08:00",
        deliveryWindowEnd: deliveryWindowEnd.trim() || "12:00",
        weight: Number(weight) || 0,
        volume: Number(volume) || 0,
        status,
      };
      if (orderId) {
        await updateOrder(orderId, payload);
      } else {
        await addOrder(payload);
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!clientId;

  return (
    <DpContentSet
      title={isEdit ? "Editar pedido" : "Agregar pedido"}
      cancelLabel="Cancelar"
      onCancel={onHide}
      saveLabel="Guardar"
      onSave={save}
      saving={saving || isNavigating}
      saveDisabled={!valid || isNavigating}
      visible={visible}
      onHide={onHide}
    >
      {loading ? (
        <div className="py-8 text-center text-zinc-500">Cargando...</div>
      ) : (
        <div className="flex flex-col gap-4 pt-2">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          <DpInput
            type="input"
            label="Código"
            name="code"
            value={code}
            onChange={setCode}
            placeholder="PED-001"
          />
          <DpInput
            type="select"
            label="Cliente"
            name="clientId"
            value={clientId}
            onChange={(v) => setClientId(String(v))}
            options={clientOptions}
            placeholder="Seleccione un cliente"
            filter
          />
          <DpInput
            type="input"
            label="Dirección de entrega"
            name="deliveryAddress"
            value={deliveryAddress}
            onChange={setDeliveryAddress}
            placeholder="Av. Brasil 1200"
          />
          <div className="grid grid-cols-2 gap-2">
            <DpInput
              type="number"
              label="Lat"
              name="latitude"
              value={latitude}
              onChange={setLatitude}
              placeholder="-12.067"
            />
            <DpInput
              type="number"
              label="Lng"
              name="longitude"
              value={longitude}
              onChange={setLongitude}
              placeholder="-77.048"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <DpInput
              type="input"
              inputType="time"
              label="Ventana inicio"
              name="deliveryWindowStart"
              value={deliveryWindowStart}
              onChange={setDeliveryWindowStart}
            />
            <DpInput
              type="input"
              inputType="time"
              label="Ventana fin"
              name="deliveryWindowEnd"
              value={deliveryWindowEnd}
              onChange={setDeliveryWindowEnd}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DpInput
              type="number"
              label="Peso"
              name="weight"
              value={weight}
              onChange={setWeight}
              placeholder="800"
            />
            <DpInput
              type="number"
              label="Volumen"
              name="volume"
              value={volume}
              onChange={setVolume}
              placeholder="4"
            />
          </div>
          <DpInput
            type="select"
            label="Estado"
            name="status"
            value={status}
            onChange={(v) => setStatus(v as OrderStatus)}
            options={STATUS_OPTIONS}
          />
        </div>
      )}
    </DpContentSet>
  );
}
