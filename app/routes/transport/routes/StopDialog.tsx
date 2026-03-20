import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getRouteStop,
  addRouteStop,
  updateRouteStop,
  type StopStatus,
  type StopType,
} from "~/features/transport/routes";
import { getOrders } from "~/features/logistic/orders";
import {
  STOP_TYPE,
  STOP_STATUS,
  statusToSelectOptions,
} from "~/constants/status-options";

export interface StopDialogProps {
  visible: boolean;
  routeId: string;
  stopId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const STOP_TYPE_OPTIONS = statusToSelectOptions(STOP_TYPE);
const STOP_STATUS_OPTIONS = statusToSelectOptions(STOP_STATUS);

export default function StopDialog({
  visible,
  routeId,
  stopId,
  onSuccess,
  onHide,
}: StopDialogProps) {
  const isEdit = !!stopId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [orderOptions, setOrderOptions] = useState<{ label: string; value: string }[]>([]);
  const [id, setId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [sequence, setSequence] = useState("");
  const [eta, setEta] = useState("");
  const [arrivalWindowStart, setArrivalWindowStart] = useState("");
  const [arrivalWindowEnd, setArrivalWindowEnd] = useState("");
  const [status, setStatus] = useState<StopStatus>("pending");
  const [type, setType] = useState<StopType>("checkpoint");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    getOrders()
      .then(({ items }) => {
        setOrderOptions([
          { label: "— Sin pedido —", value: "" },
          ...items.map((o) => ({
            label: `${o.client} — ${o.deliveryAddress}`,
            value: o.id,
          })),
        ]);
      })
      .catch(() => setOrderOptions([{ label: "— Sin pedido —", value: "" }]));

    if (!stopId) {
      setId("");
      setOrderId("");
      setSequence("");
      setEta("");
      setArrivalWindowStart("");
      setArrivalWindowEnd("");
      setStatus("pending");
      setType("checkpoint");
      setName("");
      setAddress("");
      setLat("");
      setLng("");
      setLoading(false);
      return;
    }

    setLoading(true);
    getRouteStop(routeId, stopId)
      .then((data) => {
        if (!data) {
          setError("Parada no encontrada.");
          return;
        }
        setId(data.id ?? "");
        setOrderId(data.orderId ?? "");
        setSequence(String(data.sequence ?? data.order ?? ""));
        setEta(data.eta ?? "");
        setArrivalWindowStart(data.arrivalWindowStart ?? "");
        setArrivalWindowEnd(data.arrivalWindowEnd ?? "");
        setStatus(data.status ?? "pending");
        setType(data.type ?? "checkpoint");
        setName(data.name ?? "");
        setAddress(data.address ?? "");
        setLat(String(data.lat ?? ""));
        setLng(String(data.lng ?? ""));
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar.")
      )
      .finally(() => setLoading(false));
  }, [visible, routeId, stopId]);

  const save = async () => {
    if (!name.trim()) return;
    if (!isEdit && !id.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const stopIdNorm = id.trim().toLowerCase().replace(/\s+/g, "-");
      const seq = Number(sequence) || 0;
      const payload = {
        orderId: orderId.trim(),
        sequence: seq,
        eta: eta.trim() || "",
        arrivalWindowStart: arrivalWindowStart.trim() || "",
        arrivalWindowEnd: arrivalWindowEnd.trim() || "",
        status,
        order: seq,
        type,
        name: name.trim(),
        address: address.trim(),
        lat: Number(lat) || 0,
        lng: Number(lng) || 0,
        estimatedArrivalOffsetMinutes: 0,
      };
      if (stopId) {
        await updateRouteStop(routeId, stopId, payload);
      } else {
        await addRouteStop(routeId, { id: stopIdNorm, ...payload });
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!name.trim() && (isEdit || !!id.trim());

  return (
    <DpContentSet
      title={isEdit ? "Editar parada" : "Agregar parada"}
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
          {!isEdit && (
            <DpInput
              type="input"
              label="Id (en la colección)"
              name="id"
              value={id}
              onChange={setId}
              placeholder="stop01"
              className="font-mono text-sm"
            />
          )}
          <DpInput
            type="select"
            label="Pedido"
            name="orderId"
            value={orderId}
            onChange={(v) => setOrderId(String(v))}
            options={orderOptions}
            placeholder="Seleccione un pedido (opcional)"
            filter
          />
          <DpInput
            type="number"
            label="Secuencia"
            name="sequence"
            value={sequence}
            onChange={setSequence}
            placeholder="1"
          />
          <DpInput
            type="input"
            inputType="time"
            label="ETA"
            name="eta"
            value={eta}
            onChange={setEta}
          />
          <div className="grid grid-cols-2 gap-2">
            <DpInput
              type="input"
              inputType="time"
              label="Ventana inicio"
              name="arrivalWindowStart"
              value={arrivalWindowStart}
              onChange={setArrivalWindowStart}
            />
            <DpInput
              type="input"
              inputType="time"
              label="Ventana fin"
              name="arrivalWindowEnd"
              value={arrivalWindowEnd}
              onChange={setArrivalWindowEnd}
            />
          </div>
          <DpInput
            type="select"
            label="Estado"
            name="status"
            value={status}
            onChange={(v) => setStatus(v as StopStatus)}
            options={STOP_STATUS_OPTIONS}
          />
          <DpInput
            type="select"
            label="Tipo"
            name="type"
            value={type}
            onChange={(v) => setType(v as StopType)}
            options={STOP_TYPE_OPTIONS}
          />
          <DpInput
            type="input"
            label="Nombre"
            name="name"
            value={name}
            onChange={setName}
            placeholder="Almacén Lima"
          />
          <DpInput
            type="input"
            label="Dirección"
            name="address"
            value={address}
            onChange={setAddress}
            placeholder="Av. Industrial 123"
          />
          <DpInput
            type="number"
            label="Latitud"
            name="lat"
            value={lat}
            onChange={setLat}
            placeholder="-12.0464"
          />
          <DpInput
            type="number"
            label="Longitud"
            name="lng"
            value={lng}
            onChange={setLng}
            placeholder="-77.0428"
          />
        </div>
    </DpContentSet>
  );
}
