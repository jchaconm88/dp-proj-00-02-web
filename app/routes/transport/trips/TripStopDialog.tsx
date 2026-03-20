import { useState, useEffect } from "react";
import { useNavigation } from "react-router";
import { DpInput } from "~/components/DpInput";
import { DpContentSet } from "~/components/DpContent";
import {
  getTripStop,
  addTripStop,
  updateTripStop,
  type TripStopType,
  type TripStopStatus,
} from "~/features/transport/trips";
import { STOP_TYPE, STOP_STATUS, statusToSelectOptions } from "~/constants/status-options";

export interface TripStopDialogProps {
  visible: boolean;
  tripId: string;
  stopId: string | null;
  onSuccess?: () => void;
  onHide: () => void;
}

const TYPE_OPTIONS = statusToSelectOptions(STOP_TYPE);
const STATUS_OPTIONS = statusToSelectOptions(STOP_STATUS);

export default function TripStopDialog({
  visible,
  tripId,
  stopId,
  onSuccess,
  onHide,
}: TripStopDialogProps) {
  const isEdit = !!stopId;
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  const [order, setOrder] = useState("");
  const [type, setType] = useState<TripStopType>("checkpoint");
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [status, setStatus] = useState<TripStopStatus>("pending");
  const [plannedArrival, setPlannedArrival] = useState("");
  const [actualArrival, setActualArrival] = useState("");
  const [actualDeparture, setActualDeparture] = useState("");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (!stopId) {
      setOrder("");
      setType("checkpoint");
      setName("");
      setLat("");
      setLng("");
      setStatus("pending");
      setPlannedArrival("");
      setActualArrival("");
      setActualDeparture("");
      setLoading(false);
      return;
    }
    setLoading(true);
    getTripStop(tripId, stopId)
      .then((data) => {
        if (!data) {
          setError("Parada no encontrada.");
          return;
        }
        setOrder(String(data.order ?? ""));
        setType(data.type ?? "checkpoint");
        setName(data.name ?? "");
        setLat(String(data.lat ?? ""));
        setLng(String(data.lng ?? ""));
        setStatus(data.status ?? "pending");
        setPlannedArrival(data.plannedArrival ? data.plannedArrival.slice(0, 16) : "");
        setActualArrival(data.actualArrival ? data.actualArrival.slice(0, 16) : "");
        setActualDeparture(data.actualDeparture ? data.actualDeparture.slice(0, 16) : "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar."))
      .finally(() => setLoading(false));
  }, [visible, tripId, stopId]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        order: Number(order) || 0,
        type,
        name: name.trim(),
        lat: Number(lat) || 0,
        lng: Number(lng) || 0,
        status,
        plannedArrival: plannedArrival.trim() || "",
        actualArrival: actualArrival.trim() || null,
        actualDeparture: actualDeparture.trim() || null,
      };
      if (stopId) {
        await updateTripStop(tripId, stopId, payload);
      } else {
        const generatedId = `stop-${Date.now()}`;
        await addTripStop(tripId, { id: generatedId, ...payload });
      }
      onSuccess?.();
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const valid = !!name.trim();

  return (
    <DpContentSet
      title={isEdit ? "Editar parada del viaje" : "Agregar parada del viaje"}
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
          <DpInput type="number" label="Orden" name="order" value={order} onChange={setOrder} placeholder="1" />
          <DpInput type="select" label="Tipo" name="type" value={type} onChange={(v) => setType(v as TripStopType)} options={TYPE_OPTIONS} />
          <DpInput type="input" label="Nombre" name="name" value={name} onChange={setName} placeholder="Almacén Lima" />
          <DpInput type="number" label="Latitud" name="lat" value={lat} onChange={setLat} placeholder="-12.0464" />
          <DpInput type="number" label="Longitud" name="lng" value={lng} onChange={setLng} placeholder="-77.0428" />
          <DpInput type="select" label="Estado" name="status" value={status} onChange={(v) => setStatus(v as TripStopStatus)} options={STATUS_OPTIONS} />
          <DpInput
            type="datetime"
            label="Llegada planificada"
            name="plannedArrival"
            value={plannedArrival}
            onChange={setPlannedArrival}
          />
          <DpInput
            type="datetime"
            label="Llegada real"
            name="actualArrival"
            value={actualArrival}
            onChange={setActualArrival}
          />
          <DpInput
            type="datetime"
            label="Salida real"
            name="actualDeparture"
            value={actualDeparture}
            onChange={setActualDeparture}
          />
        </div>
    </DpContentSet>
  );
}
